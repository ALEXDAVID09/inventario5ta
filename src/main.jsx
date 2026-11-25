import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

/* ============ Configuración ============ */
const PRICE = 6000
const KEY = 'helados5ta-v2'
const OLD_KEY = 'helados5ta-v1'
const COLORS = ['#d9961f', '#d6457a', '#0f766e', '#6d5bd0', '#e8704f', '#2f6fb3']

/* ============ Utilidades ============ */
const money = n =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const today = () => new Date().toLocaleDateString('en-CA')
const longDate = iso =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const shortDate = iso =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
const isMoney = v => v !== '' && Number.isSafeInteger(Number(v)) && Number(v) >= 0

// base: null = aún no se define · 0 = sin base · >0 = la dueña dejó esa plata
const fresh = () => ({
  date: today(),
  products: [
    { id: 1, name: 'Coco', stock: 0, sold: 0, added: 0 },
    { id: 2, name: 'Guayaba', stock: 0, sold: 0, added: 0 },
  ],
  history: [],
  closed: false,
  base: null,
})

function load() {
  try {
    const v2 = JSON.parse(localStorage.getItem(KEY))
    if (v2) return v2
    const v1 = JSON.parse(localStorage.getItem(OLD_KEY)) // migra datos de la versión anterior
    if (v1) return { ...fresh(), ...v1, base: v1.base ?? null }
  } catch {}
  return fresh()
}

/* ============ Íconos ============ */
const PATHS = {
  dashboard: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z',
  cone: 'm7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11 M17 7A5 5 0 0 0 7 7 M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4',
  wallet: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1 M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
  trend: 'M22 7 13.5 15.5 8.5 10.5 2 17 M16 7h6v6',
  box: 'M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8',
  coins: 'M8 8m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0 M18.1 10.4A5 5 0 1 1 10.4 18.1 M7 6h1v4',
  plus: 'M5 12h14 M12 5v14',
  undo: 'M3 7v6h6 M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13',
  check: 'M20 6 9 17l-5-5',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
}
const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {PATHS[name].split(' M').map((d, i) => <path key={i} d={(i ? 'M' : '') + d} />)}
  </svg>
)

/* ============ Piezas reutilizables ============ */
const MoneyInput = ({ label, value, onChange, disabled, placeholder = '0', autoFocus }) => (
  <label className="field">
    <span>{label}</span>
    <div className="input-money">
      <input className="input" type="number" inputMode="numeric" min="0" step="500" placeholder={placeholder}
        value={value} disabled={disabled} autoFocus={autoFocus} onChange={e => onChange(e.target.value)} />
    </div>
  </label>
)

const Stat = ({ icon, label, value, note, highlight }) => (
  <div className={'card stat' + (highlight ? ' highlight' : '')}>
    <div className="label"><Icon name={icon} size={16} />{label}</div>
    <div className="value">{value}</div>
    {note && <div className="note">{note}</div>}
  </div>
)

function diffInfo(diff) {
  if (diff === 0) return { cls: 'ok', text: 'Cuadra exacto', short: 'Cuadra' }
  if (diff > 0) return { cls: 'over', text: `Sobran ${money(diff)}`, short: `Sobran ${money(diff)}` }
  return { cls: 'short', text: `Faltan ${money(-diff)}`, short: `Faltan ${money(-diff)}` }
}

/* ============ App ============ */
function App() {
  const [data, setData] = useState(load)
  const [tab, setTab] = useState('Resumen')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState({})
  const [toast, setToast] = useState(null)
  const [baseInput, setBaseInput] = useState('')
  const [closing, setClosing] = useState(false)
  const [counted, setCounted] = useState('')

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(data)) }, [data])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const say = (text, type = 'ok') => setToast({ text, type })

  const sold = data.products.reduce((s, p) => s + p.sold, 0)
  const stock = data.products.reduce((s, p) => s + p.stock, 0)
  const sales = sold * PRICE
  const base = data.base ?? 0
  const expected = base + sales
  const locked = data.closed || data.date !== today()
  const baseUndefined = data.base === null
  const status = data.closed ? ['closed', 'Cerrada'] : locked ? ['pending', 'Pendiente de cierre'] : ['open', 'Abierta']

  /* ---- Inventario y ventas ---- */
  function change(id, type) {
    const n = Number(amount[id] ?? 1)
    if (locked || !Number.isSafeInteger(n) || n < 1) return say('Ingresa una cantidad entera positiva y verifica la jornada.', 'err')
    const p = data.products.find(p => p.id === id)
    if (type === 'sell' && n > p.stock) return say('No hay suficientes helados disponibles.', 'err')
    if (type === 'undo' && n > p.sold) return say('No puedes revertir más ventas de las registradas.', 'err')
    setData(d => ({
      ...d,
      products: d.products.map(x => x.id !== id ? x : {
        ...x,
        stock: x.stock + (type === 'sell' ? -n : n),
        sold: x.sold + (type === 'sell' ? n : type === 'undo' ? -n : 0),
        added: x.added + (type === 'add' ? n : 0),
      }),
    }))
    say(type === 'sell' ? `Venta registrada: ${n} × ${p.name} (${money(n * PRICE)})`
      : type === 'add' ? `Stock ingresado: ${n} × ${p.name}` : `Venta revertida: ${n} × ${p.name}`)
    setAmount(a => ({ ...a, [id]: 1 }))
  }

  function addFlavor(e) {
    e.preventDefault()
    const clean = name.trim()
    if (locked || !clean || data.products.some(p => p.name.toLowerCase() === clean.toLowerCase()))
      return say('Verifica el nombre del sabor (no repetido) y que la jornada esté abierta.', 'err')
    setData(d => ({ ...d, products: [...d.products, { id: Date.now(), name: clean, stock: 0, sold: 0, added: 0 }] }))
    setName('')
    say(`Sabor agregado: ${clean}`)
  }

  /* ---- Caja ---- */
  function setBase(value) {
    if (locked) return say('La jornada no está abierta.', 'err')
    if (!isMoney(value)) return say('Ingresa un monto válido (número entero, mayor o igual a 0).', 'err')
    setData(d => ({ ...d, base: Number(value) }))
    setBaseInput('')
    say(Number(value) === 0 ? 'Jornada marcada sin base inicial.' : `Base inicial registrada: ${money(Number(value))}`)
  }
  const resetBase = () => { setData(d => ({ ...d, base: null })); setBaseInput('') }

  /* ---- Jornada ---- */
  function confirmClose() {
    if (counted !== '' && !isMoney(counted)) return say('El efectivo contado no es válido.', 'err')
    const c = counted === '' ? null : Number(counted)
    setData(d => ({
      ...d,
      closed: true,
      history: [{
        date: d.date, sold, stock, total: sales, base, expected, counted: c,
        products: d.products.map(p => ({ ...p })),
      }, ...d.history],
    }))
    setClosing(false); setCounted('')
    say('Jornada cerrada correctamente.')
  }

  function openNew() {
    if (!data.closed || data.date === today()) return
    setData(d => ({ ...d, date: today(), closed: false, base: null, products: d.products.map(p => ({ ...p, sold: 0, added: 0 })) }))
    setTab('Caja')
    say('Nueva jornada iniciada. Define si hay base inicial.')
  }

  const tabs = [
    ['Resumen', 'dashboard'],
    ['Inventario y ventas', 'cone'],
    ['Caja', 'wallet'],
    ['Historial', 'clock'],
  ]

  const countedNum = counted !== '' && isMoney(counted) ? Number(counted) : null

  return (
    <div className="shell">
      {/* ---------- Barra lateral ---------- */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Icon name="cone" size={22} /></div>
          <div>
            <div className="brand-name">Helados <span>5ta</span></div>
            <div className="brand-sub">Gestión diaria</div>
          </div>
        </div>
        <nav className="nav" aria-label="Secciones">
          {tabs.map(([t, icon]) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              <Icon name={icon} />{t}
              {t === 'Caja' && baseUndefined && !locked && <span className="dot" title="Falta definir la base" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot"><b>Versión de prueba</b>Los datos se guardan solo en este navegador.</div>
      </aside>

      {/* ---------- Contenido ---------- */}
      <main className="main">
        <header className="page-head">
          <div>
            <div className="eyebrow">Tu negocio, bajo control</div>
            <h1 className="page-title">{tab}</h1>
            <p className="page-sub">{longDate(data.date)}</p>
          </div>
          <span className={'badge ' + status[0]}>{status[1]}</span>
        </header>

        {locked && (
          <div className="banner warn">
            <span><b>{data.closed ? 'Jornada cerrada.' : 'Jornada anterior sin cerrar.'}</b>{' '}
              {data.closed ? 'Podrás iniciar otra en la siguiente fecha.' : 'Ciérrala para iniciar la de hoy.'}</span>
          </div>
        )}
        {!locked && baseUndefined && tab !== 'Caja' && (
          <div className="banner info">
            <span><b>Falta un dato de caja:</b> ¿la dueña dejó plata inicial hoy?</span>
            <button className="btn sm primary" onClick={() => setTab('Caja')}>Definir base</button>
          </div>
        )}

        {/* ===== RESUMEN ===== */}
        {tab === 'Resumen' && (<>
          <div className="grid stats">
            <Stat icon="trend" label="Ventas del día" value={money(sales)} note={`${sold} helados × ${money(PRICE)}`} />
            <Stat icon="cone" label="Helados vendidos" value={sold} />
            <Stat icon="box" label="Disponibles" value={stock} note={`${data.products.length} sabores`} />
            <Stat icon="wallet" highlight label="Efectivo esperado" value={money(expected)}
              note={baseUndefined ? 'Base sin definir' : base > 0 ? `Base ${money(base)} + ventas` : 'Sin base inicial'} />
          </div>
          <div className="card">
            <div className="card-head">
              <div><h2>Ventas por sabor</h2><p className="hint">Participación de cada sabor en las ventas de hoy</p></div>
              <button className="btn primary sm" onClick={() => setTab('Inventario y ventas')}>Registrar ventas</button>
            </div>
            {data.products.map((p, i) => (
              <div className="bar-row" key={p.id}>
                <div className="bar-name"><i className="swatch" style={{ background: COLORS[i % COLORS.length] }} />{p.name}</div>
                <div className="track"><div style={{ width: `${sold ? (p.sold / sold) * 100 : 0}%`, background: COLORS[i % COLORS.length] }} /></div>
                <div className="bar-val">{p.sold}</div>
              </div>
            ))}
          </div>
        </>)}

        {/* ===== INVENTARIO Y VENTAS ===== */}
        {tab === 'Inventario y ventas' && (<>
          <div className="card">
            <div className="card-head"><div><h2>Agregar sabor</h2><p className="hint">Nuevo sabor para el inventario del día</p></div></div>
            <form className="row" onSubmit={addFlavor}>
              <label className="field">
                <span>Nombre del sabor</span>
                <input className="input" placeholder="Ej. Chocolate" value={name} onChange={e => setName(e.target.value)} required />
              </label>
              <button className="btn primary" disabled={locked} style={{ flex: 'none' }}><Icon name="plus" size={16} />Agregar</button>
            </form>
          </div>
          <div className="grid two">
            {data.products.map((p, i) => {
              const color = COLORS[i % COLORS.length]
              return (
                <div className="card product" key={p.id} style={{ '--c': color }}>
                  <div className="product-head">
                    <div className="product-title">
                      <div className="product-ico"><Icon name="cone" /></div>
                      <h2>{p.name}</h2>
                    </div>
                    <span className="price-tag">{money(PRICE)} / unidad</span>
                  </div>
                  <div className="metrics">
                    <div className={'metric' + (p.stock === 0 ? ' low' : '')}><b>{p.stock}</b><small>Disponibles</small></div>
                    <div className="metric"><b>{p.sold}</b><small>Vendidos hoy</small></div>
                    <div className="metric"><b>{money(p.sold * PRICE)}</b><small>Ingreso</small></div>
                  </div>
                  <div className="actions">
                    <label className="field">
                      <span>Cantidad</span>
                      <input className="input" type="number" min="1" step="1" value={amount[p.id] ?? 1}
                        onChange={e => setAmount(a => ({ ...a, [p.id]: e.target.value }))} />
                    </label>
                    <button className="btn primary" disabled={locked || !p.stock} onClick={() => change(p.id, 'sell')}>
                      <Icon name="check" size={16} />Vender
                    </button>
                    <div className="btn-group">
                      <button className="btn" disabled={locked} onClick={() => change(p.id, 'add')}><Icon name="plus" size={16} />Ingresar stock</button>
                      <button className="btn" disabled={locked || !p.sold} onClick={() => change(p.id, 'undo')}><Icon name="undo" size={16} />Revertir venta</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>)}

        {/* ===== CAJA ===== */}
        {tab === 'Caja' && (
          <div className="cash-grid">
            <div className="card">
              <div className="card-head">
                <div>
                  <h2>Base inicial de caja</h2>
                  <p className="hint">Es la plata que la dueña deja para dar cambio. Es opcional.</p>
                </div>
              </div>

              {baseUndefined ? (<>
                <div className="choice">
                  <button disabled={locked} onClick={() => setBase('0')}>
                    <b>Sin base</b><small>Hoy no se dejó dinero inicial</small>
                  </button>
                  <button disabled={locked} className="on" onClick={() => document.getElementById('base-input')?.focus()}>
                    <b>Con base</b><small>Registrar cuánto se dejó</small>
                  </button>
                </div>
                <div className="row">
                  <label className="field">
                    <span>Monto dejado por la dueña</span>
                    <div className="input-money">
                      <input id="base-input" className="input" type="number" inputMode="numeric" min="0" step="500" placeholder="Ej. 50000"
                        value={baseInput} disabled={locked} onChange={e => setBaseInput(e.target.value)} />
                    </div>
                  </label>
                  <button className="btn primary" disabled={locked || baseInput === ''} onClick={() => setBase(baseInput)} style={{ flex: 'none' }}>Guardar base</button>
                </div>
              </>) : (<>
                <div className="choice">
                  <button className={base === 0 ? 'on' : ''} disabled><b>Sin base</b><small>No se dejó dinero inicial</small></button>
                  <button className={base > 0 ? 'on' : ''} disabled><b>Con base</b><small>{base > 0 ? money(base) : 'No aplica hoy'}</small></button>
                </div>
                {!locked && <button className="btn sm" onClick={resetBase}>Cambiar base</button>}
              </>)}
            </div>

            <div className="card">
              <div className="card-head"><div><h2>Cuadre de caja</h2><p className="hint">Lo que debería haber en efectivo</p></div></div>
              <div className="ledger">
                <div className="ledger-row"><span>Base inicial</span><b>{baseUndefined ? '—' : money(base)}</b></div>
                <div className="ledger-row"><span>Ventas del día ({sold})</span><b>{money(sales)}</b></div>
                <div className="ledger-row total"><span>Efectivo esperado</span><b>{money(expected)}</b></div>
              </div>
              {base > 0 && (
                <p className="hint" style={{ marginTop: 14 }}>
                  Recuerda: de los {money(expected)}, {money(base)} corresponden a la base de la dueña, no a ventas.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ===== HISTORIAL ===== */}
        {tab === 'Historial' && (
          <div className="card">
            <div className="card-head"><div><h2>Jornadas cerradas</h2><p className="hint">Toca una fecha para ver el detalle</p></div></div>
            {!data.history.length && <p className="empty">Aún no hay jornadas cerradas.</p>}
            {data.history.map(h => {
              const hasCount = h.counted !== null && h.counted !== undefined
              const info = hasCount ? diffInfo(h.counted - (h.expected ?? h.total)) : null
              return (
                <details className="hist" key={h.date}>
                  <summary>
                    <div className="d">{shortDate(h.date)}<span className="k">{h.sold} vendidos</span></div>
                    <div><b>{money(h.total)}</b><span className="k">Ventas</span></div>
                    <div><b>{money(h.expected ?? h.total)}</b><span className="k">Efectivo esperado</span></div>
                  </summary>
                  <div className="hist-body">
                    <div>
                      <h3>Caja</h3>
                      <div className="ledger">
                        <div className="ledger-row"><span>Base inicial</span><b>{h.base ? money(h.base) : 'Sin base'}</b></div>
                        <div className="ledger-row"><span>Ventas</span><b>{money(h.total)}</b></div>
                        <div className="ledger-row"><span>Esperado</span><b>{money(h.expected ?? h.total)}</b></div>
                        <div className="ledger-row">
                          <span>Contado</span>
                          <b>{hasCount ? money(h.counted) : 'No registrado'}{info && <span className={'tag ' + info.cls}>{info.short}</span>}</b>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3>Por sabor</h3>
                      <div className="ledger">
                        {h.products.map(p => (
                          <div className="ledger-row" key={p.id}><span>{p.name}</span><b>{p.sold} vendidos · {p.stock} quedan</b></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </details>
              )
            })}
          </div>
        )}

        {/* ===== CONTROL DE JORNADA ===== */}
        <div className="card close-bar">
          <div>
            <h2>Control de jornada</h2>
            <p className="hint">El inventario restante se conserva para el siguiente día.</p>
          </div>
          {data.closed
            ? <button className="btn primary" disabled={data.date === today()} onClick={openNew}>Iniciar nueva jornada</button>
            : <button className="btn" onClick={() => setClosing(true)}><Icon name="lock" size={16} />Cerrar jornada</button>}
        </div>
      </main>

      {/* ---------- Modal de cierre ---------- */}
      {closing && (
        <div className="overlay" onClick={() => setClosing(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h2>Cerrar jornada</h2>
            <p className="sub">{longDate(data.date)}</p>
            <div className="ledger">
              <div className="ledger-row"><span>Base inicial</span><b>{baseUndefined || base === 0 ? 'Sin base' : money(base)}</b></div>
              <div className="ledger-row"><span>Ventas ({sold} helados)</span><b>{money(sales)}</b></div>
              <div className="ledger-row total"><span>Efectivo esperado</span><b>{money(expected)}</b></div>
            </div>
            <div style={{ marginTop: 16 }}>
              <MoneyInput label="Efectivo contado en caja (opcional)" value={counted} onChange={setCounted} autoFocus />
            </div>
            {countedNum !== null && (() => { const i = diffInfo(countedNum - expected); return <div className={'diff ' + i.cls}>{i.text}</div> })()}
            <div className="modal-actions">
              <button className="btn" onClick={() => setClosing(false)}>Cancelar</button>
              <button className="btn primary" onClick={confirmClose}>Confirmar cierre</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={'toast ' + toast.type} role="status">{toast.text}</div>}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
