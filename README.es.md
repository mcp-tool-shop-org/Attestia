<p align="center">
  <strong>English</strong> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/Attestia/main/assets/logo.png" alt="Attestia" width="400">
</p>

<h1 align="center">Attestia</h1>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/Attestia"><img src="https://codecov.io/gh/mcp-tool-shop-org/Attestia/graph/badge.svg" alt="codecov"></a>
  <a href="https://mcp-tool-shop-org.github.io/Attestia/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
  <a href="https://opensource.org/license/mit/"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License"></a>
</p>

<p align="center"><strong>Infraestructura de confianza financiera para el mundo descentralizado.</strong></p>

---

## Misión

Creemos que el dinero, sin importar dónde se encuentre o cómo se transfiera, merece el mismo nivel de rigor que los sistemas que lo generaron. Los contratos inteligentes se ejecutan. Las cadenas de bloques registran. Pero nadie *certifica* su validez.

Attestia es la capa que faltaba: proporciona gobernanza estructural, contabilidad determinista y validación de intenciones por parte de personas, todo ello integrado en diferentes cadenas, organizaciones e individuos.

No movemos su dinero. Demostramos lo que ocurrió, limitamos lo que puede suceder y garantizamos la integridad de su historial financiero.

### Nuestros valores

- **La verdad por encima de la velocidad.** Cada evento financiero es inmutable, reproducible y verificable. Si no se puede probar, no ocurrió.
- **Los humanos aprueban; las máquinas verifican.** La inteligencia artificial ofrece recomendaciones, los contratos inteligentes ejecutan acciones, pero nada se mueve sin la autorización explícita de un humano. Nunca.
- **Gobernanza estructural, no política.** No votamos sobre lo que es válido. Definimos invariantes que se cumplen de forma incondicional: la identidad es explícita, la trazabilidad es continua y el orden es determinista.
- **La intención no es la ejecución.** Declarar lo que se quiere y llevarlo a cabo son acciones separadas, con mecanismos de control distintos. El espacio entre ambas es donde reside la confianza.
- **Las cadenas son testigos, no autoridades.** XRPL certifica. Ethereum liquida. Pero la autoridad proviene de las reglas estructurales, no del consenso de ninguna cadena.
- **La infraestructura sólida es la clave del éxito.** El mundo no necesita otro protocolo DeFi. Necesita la capa de infraestructura subyacente, la base financiera que hace que todo lo demás sea confiable.

---

## Arquitectura

Attestia: tres sistemas, una verdad.

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

| Sistema. | Role | Origen. |
|--------|------|--------|
| **Personal Vault** | Observación de carteras diversificadas en múltiples cadenas, asignación presupuestaria flexible, declaración de intenciones. | Derivado de NextLedger. |
| **Org Treasury** | Nómina determinista, distribución de fondos en organizaciones autónomas descentralizadas (DAO), financiación con doble canal, libro mayor de doble contabilidad. | Derivado de Payroll Engine. |
| **Registrum** | Registrador estructural: 11 invariantes, validación con doble confirmación, certificación XRPL. | Sin cambios: capa constitucional. |

---

## Patrón fundamental

Cada interacción sigue un mismo patrón:

```
Intent → Approve → Execute → Verify
```

1. **Intención:** Un usuario o sistema declara un resultado deseado.
2. **Aprobación:** Registrum valida la estructura; un humano firma explícitamente.
3. **Ejecución:** La transacción se envía a la cadena de bloques.
4. **Verificación:** La conciliación confirma; XRPL certifica el registro.

Ningún paso es opcional. Ningún paso se automatiza y se elimina.

---

## Principios

| Principio. | Implementación. |
|-----------|---------------|
| Registros de solo adición. | No se permiten actualizaciones ni eliminaciones; solo se pueden agregar nuevas entradas. |
| Fallo seguro. | La discrepancia detiene el sistema, nunca se resuelve silenciosamente. |
| Reproducción determinista. | Los mismos eventos siempre producen el mismo resultado. |
| Asesoramiento únicamente mediante inteligencia artificial. | La inteligencia artificial puede analizar, alertar y sugerir, pero nunca aprobar, firmar ni ejecutar. |
| Observación de múltiples cadenas. | Ethereum, XRPL, Solana, soluciones de segunda capa (L2): una capa de lectura independiente de la cadena. |
| Identidad estructural. | Explícito, inmutable, único: no se trata de datos biométricos, sino de elementos constitucionales. |

---

## Estado

14 paquetes, 1.853 pruebas, 96,80% de cobertura, todo correcto. Desarrollo en público.

| Paquete. | Tests | Propósito. |
|---------|-------|---------|
| `@attestia/types` | 62 | Tipos de dominio compartidos (sin dependencias). |
| `@attestia/registrum` | 297 | Gobernanza constitucional: 11 principios fundamentales, sistema de doble verificación. |
| `@attestia/ledger` | 144 | Motor de contabilidad de doble entrada con registro de transacciones únicamente en modo de adición. |
| `@attestia/chain-observer` | 242 | Observación de datos de múltiples cadenas, de solo lectura (EVM + XRPL + Solana + soluciones de segunda capa). |
| `@attestia/vault` | 67 | Bóveda personal: carteras, presupuestos, objetivos. |
| `@attestia/treasury` | 63 | Tesorería de la organización: nómina, distribución de fondos, etapas de financiación. |
| `@attestia/reconciler` | 56 | Emparejamiento tridimensional entre diferentes sistemas + Certificación de Registrum. |
| `@attestia/witness` | 245 | Verificación en cadena de XRPL, gobernanza con múltiples firmas, reintento. |
| `@attestia/verify` | 200 | Verificación de repeticiones, evidencia de cumplimiento, aplicación de los acuerdos de nivel de servicio (SLA). |
| `@attestia/event-store` | 190 | Persistencia de eventos con almacenamiento únicamente de nuevas entradas, formato JSONL, cadena de hash, 34 tipos de eventos. |
| `@attestia/proof` | 53 | Árboles de Merkle, pruebas de inclusión, empaquetado de pruebas de verificación. |
| `@attestia/sdk` | 50 | SDK para clientes HTTP, diseñado para desarrolladores externos. |
| `@attestia/node` | 184 | API REST de Hono: más de 30 puntos de acceso, autenticación, soporte para múltiples clientes, API pública y cumplimiento normativo. |

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

Un nodo "rippled" independiente se ejecuta en Docker para realizar pruebas de integración deterministas en la cadena de bloques, sin depender de una red de pruebas, sin necesidad de un "faucet" y con un tiempo de cierre del libro mayor inferior a un segundo.

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### Documentación

| Documento. | Propósito. |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | Resumen ejecutivo y referencia completa del conjunto de documentos. |
| [ROADMAP.md](ROADMAP.md) | Plan de proyecto por fases. |
| [DESIGN.md](DESIGN.md) | Decisiones de arquitectura. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Gráfico de paquetes, flujos de datos, modelo de seguridad. |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | Estructura de 5 capas, patrones de despliegue, límites de confianza. |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Integración de la API con ejemplos de uso de `curl` + uso del SDK. |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | Guía paso a paso para la reproducción de auditorías. |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Análisis STRIDE por componente. |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | Amenaza → control → archivo → pruebas de mapeo. |
| [SECURITY.md](SECURITY.md) | Política de divulgación responsable. |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | Lista de verificación para evaluar la preparación para la adopción. |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | Resultados de pruebas de rendimiento registrados. |

---

## Licencia

[MIT](LICENSE)
