<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/Attestia/readme.png" alt="Attestia" width="400">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/Attestia"><img src="https://codecov.io/gh/mcp-tool-shop-org/Attestia/graph/badge.svg" alt="codecov"></a>
  <a href="https://mcp-tool-shop-org.github.io/Attestia/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
  <a href="https://opensource.org/license/mit/"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License"></a>
</p>

<p align="center"><strong>Financial truth infrastructure for the decentralized world.</strong></p>

---

## Misión

Creemos que el dinero, sin importar dónde se encuentre o cómo se mueva, merece el mismo nivel de rigor que los sistemas que lo crearon. Los contratos inteligentes se ejecutan. Las cadenas de bloques registran. Pero nadie *certifica*.

Attestia es la capa que falta: gobernanza estructural, contabilidad determinista y intención aprobada por humanos, todo unificado en diferentes cadenas, organizaciones e individuos.

No movemos su dinero. Demostramos lo que sucedió, limitamos lo que puede suceder y hacemos que el registro financiero sea inalterable.

### Lo que defendemos

- **Veracidad sobre velocidad.** Cada evento financiero es de solo adición, reproducible y reconciliable. Si no se puede probar, no sucedió.
- **Los humanos aprueban; las máquinas verifican.** La IA asesora, los contratos inteligentes ejecutan, pero nada se mueve sin la autorización explícita de un humano. Nunca.
- **Gobernanza estructural, no política.** No votamos sobre lo que es válido. Definimos invariantes que se cumplen incondicionalmente: la identidad es explícita, la línea de origen es ininterrumpida, el orden es determinista.
- **La intención no es la ejecución.** Declarar lo que se desea y hacerlo son actos separados con puertas separadas. La brecha entre ellos es donde reside la confianza.
- **Las cadenas son testigos, no autoridades.** XRPL certifica. Ethereum liquida. Pero la autoridad proviene de reglas estructurales, no del consenso de ninguna cadena.
- **La infraestructura sólida es la que triunfa.** El mundo no necesita otro protocolo DeFi. Necesita la capa de contabilidad subyacente, la infraestructura financiera que hace que todo lo demás sea confiable.

---

## Arquitectura

Attestia es tres sistemas, una verdad:

```
┌─────────────────────────────────────────────────────────┐
│                      ATTESTIA                           │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Personal   │  │     Org      │  │              │  │
│  │    Vault     │  │   Treasury   │  │   Registrum  │  │
│  │              │  │              │  │              │  │
│  │  Observe.    │  │  Distribute. │  │  Govern.     │  │
│  │  Budget.     │  │  Account.    │  │  Attest.     │  │
│  │  Allocate.   │  │  Reconcile.  │  │  Constrain.  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│         └────────────┬────┘                 │           │
│                      │                      │           │
│              ┌───────┴───────┐              │           │
│              │  Cross-System │◀─────────────┘           │
│              │ Reconciliation│                           │
│              └───────┬───────┘                           │
│                      │                                   │
│              ┌───────┴───────┐                           │
│              │ XRPL Witness  │                           │
│              │  (attestation)│                           │
│              └───────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

| Sistema | Rol | Origen |
|--------|------|--------|
| **Personal Vault** | Observación de carteras multi-cadena, presupuesto en sobres, declaración de intención | Evolucionado de NextLedger |
| **Org Treasury** | Nómina determinista, distribuciones de DAO, financiación con doble autorización, libro mayor de doble contabilidad | Evolucionado de Payroll Engine |
| **Registrum** | Registro estructural: 11 invariantes, validación con doble testigo, certificación XRPL | Sin cambios: capa constitucional |

---

## Patrón central

Cada interacción sigue un flujo:

```
Intent → Approve → Execute → Verify
```

1. **Intención** — Un usuario o sistema declara un resultado deseado.
2. **Aprobación** — Registrum valida estructuralmente; un humano firma explícitamente.
3. **Ejecución** — Se envía la transacción en la cadena de bloques.
4. **Verificación** — La conciliación confirma; XRPL certifica el registro.

Ningún paso es opcional. Ningún paso se automatiza.

---

## Principios

| Principio | Implementación |
|-----------|---------------|
| Registros de solo adición | Sin ACTUALIZAR, sin BORRAR: solo nuevas entradas. |
| Fallo seguro | El desacuerdo detiene el sistema, nunca se corrige silenciosamente. |
| Reproducción determinista | Los mismos eventos producen el mismo estado, siempre. |
| IA solo como asesor | La IA puede analizar, advertir y sugerir, pero nunca aprobar, firmar ni ejecutar. |
| Observación multi-cadena | Ethereum, XRPL, Solana, L2: capa de lectura independiente de la cadena. |
| Identidad estructural | Explícita, inmutable y única: no biométrica, sino constitucional. |

---

## Estado

14 paquetes, 1853 pruebas, 96.80% de cobertura, todo en verde. Desarrollando en público.

| Paquete | Pruebas | Propósito |
|---------|-------|---------|
| `@attestia/types` | 62 | Tipos de dominio compartidos (sin dependencias) |
| `@attestia/registrum` | 297 | Gobernanza constitucional: 11 invariantes, doble testigo |
| `@attestia/ledger` | 144 | Motor de doble contabilidad de solo adición |
| `@attestia/chain-observer` | 242 | Observación de solo lectura multi-cadena (EVM + XRPL + Solana + L2) |
| `@attestia/vault` | 67 | Bote personal: carteras, presupuestos, intenciones |
| `@attestia/treasury` | 63 | Tesorería de la organización: nómina, distribuciones, puertas de financiación |
| `@attestia/reconciler` | 56 | Emparejamiento entre sistemas en 3D + Atestación de Registrum. |
| `@attestia/witness` | 245 | Atestación en la cadena de bloques de XRPL, gobernanza multi-firma, reintento. |
| `@attestia/verify` | 200 | Verificación de repetición, evidencia de cumplimiento, aplicación de acuerdos de nivel de servicio (SLA). |
| `@attestia/event-store` | 190 | Persistencia de eventos de solo adición, JSONL, cadena de hash, 34 tipos de eventos. |
| `@attestia/proof` | 53 | Árboles de Merkle, pruebas de inclusión, empaquetado de pruebas de atestación. |
| `@attestia/sdk` | 50 | SDK de cliente HTTP con tipado para consumidores externos. |
| `@attestia/node` | 184 | API REST de Hono: más de 30 puntos finales, autenticación, multi-inquilinato, API pública, cumplimiento. |

### Desarrollo

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

### Pruebas de integración de XRPL

Un nodo `rippled` independiente se ejecuta en Docker para pruebas de integración deterministas en la cadena de bloques: sin dependencia de testnet, sin "faucet", cierre del libro mayor en menos de un segundo.

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### Documentación

| Documento. | Propósito |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | Resumen ejecutivo y referencia completa del paquete. |
| [ROADMAP.md](ROADMAP.md) | Hoja de ruta del proyecto por fases. |
| [DESIGN.md](DESIGN.md) | Decisiones de arquitectura. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Gráfico de paquetes, flujos de datos, modelo de seguridad. |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | Pila de 5 capas, patrones de implementación, límites de confianza. |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Integración de API con ejemplos de curl + uso del SDK. |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | Guía paso a paso para auditores. |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Análisis STRIDE por componente. |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | Mapeo de amenaza → control → archivo → prueba. |
| [SECURITY.md](SECURITY.md) | Política de divulgación responsable. |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | Lista de verificación de preparación para la adopción. |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | Resultados de pruebas de rendimiento registrados. |

---

## Alcance de seguridad y datos

- **Datos accedidos:** Lectura y escritura de entradas del libro mayor financiero, registros de atestación y pruebas criptográficas. Se conecta a nodos de blockchain (XRPL) cuando el módulo de testigo está activo.
- **Datos NO accedidos:** Sin telemetría. Sin almacenamiento de credenciales de usuario. Sin análisis de terceros.
- **Permisos requeridos:** Acceso de lectura/escritura a directorios de datos locales. Acceso a la red solo para la atestación de blockchain. Consulte [THREAT_MODEL.md](THREAT_MODEL.md) para el análisis STRIDE completo.

## Cuadro de evaluación

| Puerta de entrada. | Estado |
|------|--------|
| A. Línea de base de seguridad. | PASADO. |
| B. Manejo de errores. | PASADO. |
| C. Documentación para operadores. | PASADO. |
| D. Higiene de la entrega. | PASADO. |
| E. Identidad. | PASADO. |

## Licencia

[MIT](LICENSE)

---

Creado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
