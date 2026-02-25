<p align="center">
  <a href="README.md">English</a> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <strong>Español</strong> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/Attestia/main/assets/logo.png" alt="Attestia" width="400">
</p>

<h1 align="center">Attestia</h1>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/Attestia"><img src="https://codecov.io/gh/mcp-tool-shop-org/Attestia/graph/badge.svg" alt="codecov"></a>
</p>

<p align="center"><strong>Financial truth infrastructure for the decentralized world.</strong></p>

***

<a id="mission"></a>

## Misión

Creemos que el dinero — dondequiera que resida, de cualquier forma que se mueva — merece el mismo rigor que los sistemas que lo crearon. Los contratos inteligentes se ejecutan. Las cadenas de bloques registran. Pero nadie *atesta*.

Attestia es la capa faltante: gobernanza estructural, contabilidad determinista e intención aprobada por humanos — unificadas entre cadenas, organizaciones e individuos.

No movemos tu dinero. Probamos qué sucedió, limitamos qué puede suceder y hacemos que el registro financiero sea inquebrantable.

<a id="what-we-stand-for"></a>

### En Qué Creemos

- **Verdad sobre velocidad.** Cada evento financiero es de solo adición, reproducible y reconciliable. Si no se puede probar, no sucedió.
- **Los humanos aprueban; las máquinas verifican.** La inteligencia artificial asesora, los contratos inteligentes se ejecutan, pero nada se mueve sin autorización explícita del humano. Nunca.
- **Gobernanza estructural, no gobernanza política.** No votamos sobre qué es válido. Definimos invariantes que se mantienen incondicionalmente — la identidad es explícita, el linaje es ininterrumpido, el orden es determinista.
- **La intención no es ejecución.** Declarar lo que quieres y hacerlo son actos separados con compuertas separadas. El espacio entre ellos es donde vive la confianza.
- **Las cadenas son testigos, no autoridades.** XRPL atestigua. Ethereum liquida. Pero la autoridad fluye de reglas estructurales, no del consenso de ninguna cadena.
- **La infraestructura aburrida gana.** El mundo no necesita otro protocolo DeFi. Necesita la capa de contabilidad debajo — la infraestructura financiera que hace que todo lo demás sea confiable.

***

<a id="architecture"></a>

## Arquitectura

Attestia son tres sistemas, una verdad:

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

| Sistema             | Rol                                                                                                      | Origen                             |
| ------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Bóveda Personal** | Observación de cartera multicadena, presupuestación de sobres, declaración de intención                  | Evolucionado desde NextLedger      |
| **Tesorería Org**   | Nómina determinista, distribuciones DAO, financiamiento de doble compuerta, libro mayor de doble entrada | Evolucionado desde Motor de Nómina |
| **Registrum**       | Registrador estructural — 11 invariantes, validación de doble testigo, atestación XRPL                   | Sin cambios — capa constitucional  |

***

<a id="core-pattern"></a>

## Patrón Fundamental

Cada interacción sigue un flujo:

```
Intent → Approve → Execute → Verify
```

1. **Intención** — Un usuario o sistema declara un resultado deseado
1. **Aprobar** — Registrum valida estructuralmente; un humano firma explícitamente
1. **Ejecutar** — La transacción en cadena se envía
1. **Verificar** — La reconciliación confirma; XRPL atestigua el registro

Ningún paso es opcional. Ningún paso está automatizado.

***

<a id="principles"></a>

## Principios

| Principio                 | Implementación                                                             |
| ------------------------- | -------------------------------------------------------------------------- |
| Registros de solo adición | Sin UPDATE, sin DELETE — solo nuevas entradas                              |
| Falla cerrada             | El desacuerdo detiene el sistema, nunca se cura silenciosamente            |
| Reproducción determinista | Los mismos eventos producen el mismo estado, siempre                       |
| Solo IA asesora           | La IA puede analizar, advertir, sugerir — nunca aprobar, firmar o ejecutar |
| Observación multicadena   | Ethereum, XRPL, Solana, L2s — capa de lectura agnóstica a cadenas          |
| Identidad estructural     | Explícita, inmutable, única — no biométrica, sino constitucional           |

***

<a id="status"></a>

## Estado

14 paquetes, 1.853 pruebas, cobertura del 96,80%, todo en verde. Construyendo en público.

| Paquete                    | Pruebas | Propósito                                                                                    |
| -------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `@attestia/types`          | 62      | Tipos de dominio compartidos (cero dependencias)                                             |
| `@attestia/registrum`      | 297     | Gobernanza constitucional — 11 invariantes, doble testigo                                    |
| `@attestia/ledger`         | 144     | Motor de doble entrada de solo adición                                                       |
| `@attestia/chain-observer` | 242     | Observación de solo lectura en múltiples cadenas (EVM + XRPL + Solana + L2s)                 |
| `@attestia/vault`          | 67      | Bóveda personal — portafolios, presupuestos, intenciones                                     |
| `@attestia/treasury`       | 63      | Tesorería organizacional — nómina, distribuciones, compuertas de financiamiento              |
| `@attestia/reconciler`     | 56      | Coincidencia 3D entre sistemas + atestación de Registrum                                     |
| `@attestia/witness`        | 245     | Atestación en cadena XRPL, gobernanza multifirma, reintento                                  |
| `@attestia/verify`         | 200     | Verificación de repetición, evidencia de cumplimiento, aplicación de SLA                     |
| `@attestia/event-store`    | 190     | Persistencia de eventos de solo adición, JSONL, cadena hash, 34 tipos de eventos             |
| `@attestia/proof`          | 53      | Árboles de Merkle, pruebas de inclusión, empaquetamiento de pruebas de atestación            |
| `@attestia/sdk`            | 50      | SDK de cliente HTTP tipado para consumidores externos                                        |
| `@attestia/node`           | 184     | API REST Hono — 30+ puntos finales, autenticación, multi-tenencia, API pública, cumplimiento |

<a id="development"></a>

### Desarrollo

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

<a id="xrpl-integration-testing"></a>

### Pruebas de integración XRPL

Un nodo `rippled` independiente se ejecuta en Docker para pruebas de integración en cadena deterministas — sin dependencia de testnet, sin grifo, cierre de libro mayor en menos de un segundo.

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

<a id="documentation"></a>

### Documentación

| Documento                                                 | Propósito                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| [HANDBOOK.md](HANDBOOK.md)                                | Descripción general ejecutiva y referencia completa de paquetes   |
| [ROADMAP.md](ROADMAP.md)                                  | Hoja de ruta del proyecto fase por fase                           |
| [DESIGN.md](DESIGN.md)                                    | Decisiones de arquitectura                                        |
| [ARCHITECTURE.md](ARCHITECTURE.md)                        | Gráfico de paquetes, flujos de datos, modelo de seguridad         |
| [REFERENCE\_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md)   | Pila de 5 capas, patrones de implementación, límites de confianza |
| [INTEGRATION\_GUIDE.md](INTEGRATION_GUIDE.md)             | Integración de API con ejemplos curl + uso de SDK                 |
| [VERIFICATION\_GUIDE.md](VERIFICATION_GUIDE.md)           | Guía paso a paso para auditor de repetición                       |
| [THREAT\_MODEL.md](THREAT_MODEL.md)                       | Análisis STRIDE por componente                                    |
| [CONTROL\_MATRIX.md](CONTROL_MATRIX.md)                   | Asignaciones de amenaza → control → archivo → prueba              |
| [SECURITY.md](SECURITY.md)                                | Política de divulgación responsable                               |
| [INSTITUTIONAL\_READINESS.md](INSTITUTIONAL_READINESS.md) | Lista de verificación de preparación para adopción                |
| [PERFORMANCE\_BASELINE.md](PERFORMANCE_BASELINE.md)       | Puntos de referencia registrados                                  |

***

<a id="license"></a>

## Licencia

[MIT](LICENSE)
