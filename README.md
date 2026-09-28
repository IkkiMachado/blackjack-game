# ♠️ Blackjack 21 - Cassino Royale

Um jogo de **Blackjack ("21")** moderno, elegante e responsivo, desenvolvido com tecnologias web nativas (**HTML5**, **CSS3** e **JavaScript Vanilla**), sem dependência de frameworks ou bibliotecas externas.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## ✨ Funcionalidades Principais

- 🃏 **Cartas 3D Realistas em Puro CSS**:
  - Efeito de perspectiva (`transform-style: preserve-3d`) com animação fluida ao virar a carta oculta do dealer (*flip animation*).
  - Animação de distribuição de cartas (*deal slide*).
  - Naipes vetorizados (Copas ♥️, Ouros ♦️, Espadas ♠️, Paus ♣️) e figuras estilizadas (J, Q, K, A).
  - Verso clássico de baralho de cassino com padrão geométrico arabesco.

- ✂️ **Suporte Completo ao Split (Dividir Pares)**:
  - Permite dividir mãos que iniciem com cartas de mesmo valor/figura em duas mãos distintas.
  - Interface adaptável que exibe ambas as mãos lado a lado, com destaque dinâmico da mão ativa.
  - Resolução e pagamentos calculados individualmente para cada mão.

- 💰 **Sistema de Apostas com Fichas Interativas**:
  - Fichas táteis de \$10, \$25, \$50, \$100 e \$500 com física de clique e empilhamento visual.
  - Ações rápidas: *Repetir Aposta*, *Dobrar Aposta (2x)*, *Limpar* e *All-In*.
  - Gestão de banca do jogador com opção de recarga caso fique sem saldo.

- ⚡ **Regras Oficiais de Cassino**:
  - Sapata com 6 baralhos (312 cartas) embaralhados com algoritmo **Fisher-Yates**.
  - Cálculo inteligente e dinâmico do **Ás flexível** (11 ou 1).
  - Dealer compra até atingir 17 pontos ou mais.
  - Pagamento de **3:2 para Blackjack Natural** e **1:1 para vitórias normais**.
  - Ação de **Dobrar (Double Down)**.

- 🔊 **Efeitos Sonoros Procedurais (Web Audio API)**:
  - Síntese de áudio em tempo real pelo navegador (sem carregar arquivos MP3 externos): som de feltro/cartas, clique de fichas, fanfarras de vitória e som de derrota.
  - Botão de mutar/desmutar áudio.

---

## 🚀 Como Executar

Por ser construído 100% com tecnologias nativas do navegador, nenhuma instalação é necessária.

1. Clone o repositório:
   ```bash
   git clone https://github.com/IkkiMachado/blackjack-game.git
   ```
2. Abra o arquivo `index.html` em qualquer navegador moderno (Chrome, Firefox, Safari, Edge):
   - No Windows: duplo clique no arquivo `index.html`.

---

## 📁 Estrutura de Arquivos

```
blackjack/
├── index.html        # Estrutura semântica da mesa, HUD e controles
├── style.css         # Design da mesa de feltro, cartas 3D, fichas e responsividade
├── script.js         # Lógica do jogo, baralhos, split, dealer AI e Web Audio API
├── .gitignore        # Arquivos ignorados pelo Git
└── README.md         # Documentação do projeto
```

---

## 📜 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais informações.
