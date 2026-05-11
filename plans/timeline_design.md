# Design Proposto: Interface Linha do Tempo (Jornada 3A)

A nova visualização da aba 'jornada' substituirá a estrutura atual de cards estáticos por uma linha do tempo interativa e gamificada, conectada ao fluxo 3A (Acreditar, Aprender, Agir).

## 1. Estrutura HTML (dentro de `tab-jornada`)

A estrutura será dinâmica, renderizada via JS a partir dos dados do `doGet.gs`.

```html
<div class="timeline-container">
    <!-- Indicador do Fluxo 3A -->
    <div class="fluxo-3a-header">
        <div class="fluxo-step active">ACREDITAR</div>
        <div class="fluxo-step">APRENDER</div>
        <div class="fluxo-step">AGIR</div>
    </div>
    
    <!-- Linha do Tempo -->
    <div class="timeline-wrapper">
        <div class="timeline-line"></div>
        <div class="timeline-steps">
            <!-- Renderizado via JS -->
            <div class="timeline-step unlocked">
                <div class="step-icon">🏅</div>
                <div class="step-label">Etapa 1</div>
            </div>
            <div class="timeline-step locked">
                <div class="step-icon">🔒</div>
                <div class="step-label">Etapa 2</div>
            </div>
        </div>
    </div>
</div>
```

## 2. Estilos CSS Sugeridos

```css
.timeline-wrapper {
    position: relative;
    padding: 40px 0;
    overflow-x: auto;
}

.timeline-line {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 4px;
    background: #e2e8f0;
    z-index: 0;
}

.timeline-steps {
    display: flex;
    justify-content: space-around;
    align-items: center;
    position: relative;
    z-index: 1;
}

.timeline-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.step-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #fff;
    border: 3px solid #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    transition: all 0.3s ease;
}

.timeline-step.unlocked .step-icon {
    border-color: var(--pet-purple);
    background: #f5f3ff;
    box-shadow: 0 0 15px rgba(99,102,241,0.4);
}

.step-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--pet-text-sub);
}

.unlocked .step-label {
    color: var(--pet-purple);
}
```

## 3. Integração do Fluxo 3A

- **Visualização**: Os três pilares (Acreditar, Aprender, Agir) aparecerão no topo da jornada como indicadores de progresso.
- **Dinâmica**: O JS percorrerá os dados da aluna, comparando o nível de progresso (talvez usando XP total ou badge atual) com as etapas definidas.
- **Estados**:
    - `unlocked`: Etapa concluída (ícone da medalha).
    - `current` (a ser implementado): Etapa ativa (ícone brilhante ou pulsação).
    - `locked`: Etapa bloqueada (ícone de cadeado).

---
Este design propõe uma interface mais intuitiva e visual para que a aluna entenda onde está em sua jornada e o que precisa fazer para avançar.
