/**
 * ============================================================================
 * BLACKJACK 21 - CASSINO ROYALE
 * HTML5 / CSS3 / Vanilla JavaScript
 * Implementação completa com Split (Dividir Pares), Double Down e Áudio Nativo
 * ============================================================================
 */

// ============================================================================
// 1. GERADOR DE ÁUDIO PROCEDURAL (Web Audio API)
// ============================================================================
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Som de carta deslizando no feltro
  playCard() {
    if (this.muted) return;
    this.init();
    try {
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, this.ctx.currentTime);
      filter.Q.setValueAtTime(3, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
    } catch (e) {
      // Falha silenciosa em navegadores restritivos
    }
  }

  // Som de clique/empilhamento de fichas
  playChip() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {}
  }

  // Fanfarra de vitória
  playWin() {
    if (this.muted) return;
    this.init();
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // Dó, Mi, Sol, Dó
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = this.ctx.currentTime + idx * 0.1;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {}
  }

  // Fanfarra de Blackjack
  playBlackjack() {
    if (this.muted) return;
    this.init();
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const startTime = this.ctx.currentTime + idx * 0.08;
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } catch (e) {}
  }

  // Som de derrota / bust
  playBust() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  }
}

// ============================================================================
// 2. MODELO DE BARALHO (Shoe de 6 Baralhos & Fisher-Yates)
// ============================================================================
const SUITS = [
  { name: 'spades', symbol: '♠', color: 'black' },
  { name: 'hearts', symbol: '♥', color: 'red' },
  { name: 'diamonds', symbol: '♦', color: 'red' },
  { name: 'clubs', symbol: '♣', color: 'black' }
];

const RANKS = [
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 10, isRoyal: true },
  { rank: 'Q', value: 10, isRoyal: true },
  { rank: 'K', value: 10, isRoyal: true },
  { rank: 'A', value: 11, isAce: true }
];

class Deck {
  constructor(numberOfDecks = 6) {
    this.numberOfDecks = numberOfDecks;
    this.cards = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    for (let d = 0; d < this.numberOfDecks; d++) {
      for (const suit of SUITS) {
        for (const r of RANKS) {
          this.cards.push({
            suit: suit.name,
            symbol: suit.symbol,
            color: suit.color,
            rank: r.rank,
            value: r.value,
            isRoyal: !!r.isRoyal,
            isAce: !!r.isAce,
            id: Math.random().toString(36).substring(2, 9)
          });
        }
      }
    }
    this.shuffle();
  }

  // Embaralhamento Fisher-Yates
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(isFaceDown = false) {
    if (this.cards.length < 52) {
      // Reembaralha se o sapata estiver perto do fim
      this.reset();
    }
    const card = this.cards.pop();
    card.isFaceDown = isFaceDown;
    return card;
  }

  remainingCount() {
    return this.cards.length;
  }
}

// ============================================================================
// 3. MODELO DE MÃO (Hand) & CÁLCULO INTELIGENTE DO ÁS
// ============================================================================
class Hand {
  constructor(bet = 0, isSplit = false) {
    this.cards = [];
    this.bet = bet;
    this.isSplit = isSplit;
    this.status = 'playing'; // 'playing', 'stand', 'bust', 'blackjack', 'resolved'
    this.result = ''; // 'win', 'lose', 'push', 'blackjack', 'bust'
    this.resultMessage = '';
  }

  addCard(card) {
    this.cards.push(card);
  }

  // Cálculo dinâmico do Ás (11 ou 1)
  getScore() {
    let total = 0;
    let aces = 0;

    for (const card of this.cards) {
      if (card.isFaceDown) continue; // Não soma a carta oculta
      total += card.value;
      if (card.isAce) aces++;
    }

    // Se estourar 21 e tiver Ás contando como 11, reduz para 1
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    const isSoft = aces > 0;
    const isBust = total > 21;
    const isBlackjack = !this.isSplit && this.cards.length === 2 && total === 21;

    return { total, isSoft, isBust, isBlackjack };
  }

  canSplit() {
    // Permite dividir se tiver exatamente 2 cartas com mesmo rank ou mesmo valor (10-10)
    if (this.cards.length !== 2) return false;
    return this.cards[0].rank === this.cards[1].rank || this.cards[0].value === this.cards[1].value;
  }

  canDouble() {
    return this.cards.length === 2 && this.status === 'playing';
  }
}

// ============================================================================
// 4. MOTOR PRINCIPAL DO JOGO (Game Controller)
// ============================================================================
class BlackjackGame {
  constructor() {
    this.sounds = new SoundEffects();
    this.deck = new Deck(6);

    // Estados da Banca e Apostas
    this.bankroll = 1000;
    this.currentBet = 0;
    this.lastBet = 0;
    this.phase = 'betting'; // 'betting', 'player-turn', 'dealer-turn', 'ended'

    // Mãos
    this.dealerCards = [];
    this.playerHands = [];
    this.activeHandIndex = 0;

    // Cache de elementos do DOM
    this.dom = {
      balanceDisplay: document.getElementById('balance-display'),
      totalBetDisplay: document.getElementById('total-bet-display'),
      betSpotAmount: document.getElementById('bet-spot-amount'),
      chipStackVisual: document.getElementById('chip-stack-visual'),
      deckCountDisplay: document.getElementById('deck-count-display'),
      announcementBanner: document.getElementById('announcement-banner'),
      announcementText: document.getElementById('announcement-text'),

      dealerScore: document.getElementById('dealer-score'),
      dealerScoreBadge: document.getElementById('dealer-score-badge'),
      dealerCards: document.getElementById('dealer-cards'),

      playerHandsContainer: document.getElementById('player-hands-container'),
      bettingZone: document.getElementById('betting-zone'),

      // Botões
      dealBtn: document.getElementById('deal-btn'),
      hitBtn: document.getElementById('hit-btn'),
      standBtn: document.getElementById('stand-btn'),
      doubleBtn: document.getElementById('double-btn'),
      splitBtn: document.getElementById('split-btn'),

      rebetBtn: document.getElementById('rebet-btn'),
      clearBetBtn: document.getElementById('clear-bet-btn'),
      doubleBetBtn: document.getElementById('double-bet-btn'),
      allInBtn: document.getElementById('all-in-btn'),

      soundBtn: document.getElementById('sound-btn'),
      soundIcon: document.getElementById('sound-icon'),
      rulesBtn: document.getElementById('rules-btn'),
      rulesModal: document.getElementById('rules-modal'),
      closeRulesBtn: document.getElementById('close-rules-btn'),
      gotItBtn: document.getElementById('got-it-btn'),
      resetBankrollBtn: document.getElementById('reset-bankroll-btn'),

      chips: document.querySelectorAll('.chip')
    };

    this.initEventListeners();
    this.updateUI();
  }

  // --------------------------------------------------------------------------
  // EVENT LISTENERS & INICIALIZAÇÃO
  // --------------------------------------------------------------------------
  initEventListeners() {
    // Fichas
    this.dom.chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const val = parseInt(chip.dataset.value, 10);
        this.addBet(val);
      });
    });

    // Ações de aposta
    this.dom.rebetBtn.addEventListener('click', () => this.rebet());
    this.dom.clearBetBtn.addEventListener('click', () => this.clearBet());
    this.dom.doubleBetBtn.addEventListener('click', () => this.doubleBet());
    this.dom.allInBtn.addEventListener('click', () => this.allInBet());

    // Botões de jogo
    this.dom.dealBtn.addEventListener('click', () => this.startDeal());
    this.dom.hitBtn.addEventListener('click', () => this.playerHit());
    this.dom.standBtn.addEventListener('click', () => this.playerStand());
    this.dom.doubleBtn.addEventListener('click', () => this.playerDouble());
    this.dom.splitBtn.addEventListener('click', () => this.playerSplit());

    // Modais e som
    this.dom.soundBtn.addEventListener('click', () => {
      const isMuted = this.sounds.toggleMute();
      this.dom.soundIcon.textContent = isMuted ? '🔇' : '🔊';
    });

    this.dom.rulesBtn.addEventListener('click', () => this.dom.rulesModal.classList.add('is-open'));
    this.dom.closeRulesBtn.addEventListener('click', () => this.dom.rulesModal.classList.remove('is-open'));
    this.dom.gotItBtn.addEventListener('click', () => this.dom.rulesModal.classList.remove('is-open'));

    this.dom.rulesModal.addEventListener('click', (e) => {
      if (e.target === this.dom.rulesModal) {
        this.dom.rulesModal.classList.remove('is-open');
      }
    });

    this.dom.resetBankrollBtn.addEventListener('click', () => {
      if (this.phase === 'betting') {
        this.bankroll = Math.max(this.bankroll, 1000);
        this.showAnnouncement('Banca recarregada para $1.000!');
        this.sounds.playChip();
        this.updateUI();
      }
    });
  }

  // --------------------------------------------------------------------------
  // SISTEMA DE APOSTAS
  // --------------------------------------------------------------------------
  addBet(amount) {
    if (this.phase !== 'betting') return;
    if (this.bankroll >= amount) {
      this.bankroll -= amount;
      this.currentBet += amount;
      this.sounds.playChip();
      this.updateUI();
    } else {
      this.showAnnouncement('Saldo insuficiente para esta ficha!');
    }
  }

  rebet() {
    if (this.phase !== 'betting' || this.lastBet <= 0) return;
    if (this.bankroll >= this.lastBet) {
      this.bankroll -= this.lastBet;
      this.currentBet += this.lastBet;
      this.sounds.playChip();
      this.showAnnouncement(`Aposta repetida de $${this.currentBet}!`);
      this.updateUI();
    } else {
      this.showAnnouncement('Saldo insuficiente para repetir a última aposta!');
    }
  }

  clearBet() {
    if (this.phase !== 'betting' || this.currentBet === 0) return;
    this.bankroll += this.currentBet;
    this.currentBet = 0;
    this.sounds.playChip();
    this.updateUI();
  }

  doubleBet() {
    if (this.phase !== 'betting' || this.currentBet === 0) return;
    if (this.bankroll >= this.currentBet) {
      this.bankroll -= this.currentBet;
      this.currentBet *= 2;
      this.sounds.playChip();
      this.updateUI();
    } else {
      this.showAnnouncement('Saldo insuficiente para dobrar a aposta!');
    }
  }

  allInBet() {
    if (this.phase !== 'betting' || this.bankroll <= 0) return;
    const all = this.bankroll;
    this.bankroll = 0;
    this.currentBet += all;
    this.sounds.playChip();
    this.showAnnouncement(`ALL-IN! Aposta de $${this.currentBet}!`);
    this.updateUI();
  }

  // --------------------------------------------------------------------------
  // FLUXO DE DISTRIBUIÇÃO (DEAL)
  // --------------------------------------------------------------------------
  async startDeal() {
    if (this.phase !== 'betting' || this.currentBet <= 0) return;

    this.phase = 'player-turn';
    this.dealerCards = [];
    this.playerHands = [new Hand(this.currentBet, false)];
    this.activeHandIndex = 0;

    this.showAnnouncement('Distribuindo as cartas...');
    this.updateUI();

    // Sequência de distribuição de cartas com intervalo realista:
    // 1. Jogador (aberta)
    await this.sleep(250);
    this.playerHands[0].addCard(this.deck.draw(false));
    this.sounds.playCard();
    this.renderCards();

    // 2. Dealer (aberta)
    await this.sleep(300);
    this.dealerCards.push(this.deck.draw(false));
    this.sounds.playCard();
    this.renderCards();

    // 3. Jogador (aberta)
    await this.sleep(300);
    this.playerHands[0].addCard(this.deck.draw(false));
    this.sounds.playCard();
    this.renderCards();

    // 4. Dealer (oculta - face down)
    await this.sleep(300);
    this.dealerCards.push(this.deck.draw(true));
    this.sounds.playCard();
    this.renderCards();

    // Checar Blackjack natural imediato
    await this.sleep(350);
    const playerFirstHand = this.playerHands[0];
    const playerScore = playerFirstHand.getScore();

    if (playerScore.isBlackjack) {
      playerFirstHand.status = 'blackjack';
      this.showAnnouncement('BLACKJACK NATURAL! 🌟');
      this.sounds.playBlackjack();
      // Revela carta do dealer e resolve
      await this.sleep(800);
      await this.startDealerTurn();
      return;
    }

    this.showAnnouncement('Sua vez! Escolha sua jogada:');
    this.updateUI();
  }

  // --------------------------------------------------------------------------
  // AÇÕES DO JOGADOR (HIT, STAND, DOUBLE, SPLIT)
  // --------------------------------------------------------------------------
  getActiveHand() {
    return this.playerHands[this.activeHandIndex];
  }

  async playerHit() {
    if (this.phase !== 'player-turn') return;
    const hand = this.getActiveHand();
    if (!hand || hand.status !== 'playing') return;

    // Compra 1 carta
    const newCard = this.deck.draw(false);
    hand.addCard(newCard);
    this.sounds.playCard();
    this.renderCards();

    const score = hand.getScore();
    if (score.isBust) {
      hand.status = 'bust';
      this.sounds.playBust();
      this.showAnnouncement('ESTOUROU! (Bust)');
      await this.sleep(700);
      this.advanceToNextHandOrDealer();
    } else if (score.total === 21) {
      hand.status = 'stand';
      this.showAnnouncement('21 PONTOS!');
      await this.sleep(600);
      this.advanceToNextHandOrDealer();
    } else {
      this.updateUI();
    }
  }

  async playerStand() {
    if (this.phase !== 'player-turn') return;
    const hand = this.getActiveHand();
    if (!hand) return;

    hand.status = 'stand';
    this.advanceToNextHandOrDealer();
  }

  async playerDouble() {
    if (this.phase !== 'player-turn') return;
    const hand = this.getActiveHand();
    if (!hand || !hand.canDouble() || this.bankroll < hand.bet) return;

    // Dobra a aposta da mão
    this.bankroll -= hand.bet;
    hand.bet *= 2;
    this.sounds.playChip();
    this.showAnnouncement(`Aposta dobrada para $${hand.bet}!`);

    // Recebe exatamente mais 1 carta
    await this.sleep(250);
    const newCard = this.deck.draw(false);
    hand.addCard(newCard);
    this.sounds.playCard();
    this.renderCards();

    const score = hand.getScore();
    if (score.isBust) {
      hand.status = 'bust';
      this.sounds.playBust();
      this.showAnnouncement('ESTOUROU NO DOBRO!');
    } else {
      hand.status = 'stand';
    }

    await this.sleep(700);
    this.advanceToNextHandOrDealer();
  }

  // --------------------------------------------------------------------------
  // DIVIDIR PARES (SPLIT)
  // --------------------------------------------------------------------------
  async playerSplit() {
    if (this.phase !== 'player-turn') return;
    if (this.playerHands.length !== 1) return;

    const originalHand = this.playerHands[0];
    if (!originalHand.canSplit() || this.bankroll < originalHand.bet) {
      this.showAnnouncement('Não é possível dividir esta mão!');
      return;
    }

    // Deduz valor equivalente para a segunda mão
    const splitBet = originalHand.bet;
    this.bankroll -= splitBet;
    this.sounds.playChip();

    // Separa as duas cartas
    const card1 = originalHand.cards[0];
    const card2 = originalHand.cards[1];

    const hand1 = new Hand(splitBet, true);
    hand1.addCard(card1);

    const hand2 = new Hand(splitBet, true);
    hand2.addCard(card2);

    this.playerHands = [hand1, hand2];
    this.activeHandIndex = 0;

    this.showAnnouncement('Mão dividida em duas! Jogando Mão 1...');
    this.renderCards();

    // Distribui uma nova carta imediatamente para a Mão 1
    await this.sleep(400);
    hand1.addCard(this.deck.draw(false));
    this.sounds.playCard();
    this.renderCards();

    // Checa se a Mão 1 já fez 21
    if (hand1.getScore().total === 21) {
      hand1.status = 'stand';
      await this.sleep(500);
      this.advanceToNextHandOrDealer();
    } else {
      this.updateUI();
    }
  }

  // Avança entre Mão 1 -> Mão 2 -> Turno do Dealer
  async advanceToNextHandOrDealer() {
    if (this.playerHands.length > 1 && this.activeHandIndex === 0) {
      // Passa para a Mão 2
      this.activeHandIndex = 1;
      const hand2 = this.playerHands[1];
      this.showAnnouncement('Vez da Mão 2! Distribuindo segunda carta...');
      this.updateUI();

      await this.sleep(500);
      hand2.addCard(this.deck.draw(false));
      this.sounds.playCard();
      this.renderCards();

      if (hand2.getScore().total === 21) {
        hand2.status = 'stand';
        await this.sleep(600);
        this.startDealerTurn();
      } else {
        this.updateUI();
      }
    } else {
      // Todas as mãos do jogador terminaram -> Turno do Dealer
      this.startDealerTurn();
    }
  }

  // --------------------------------------------------------------------------
  // TURNO DO DEALER & RESOLUÇÃO
  // --------------------------------------------------------------------------
  async startDealerTurn() {
    this.phase = 'dealer-turn';
    this.showAnnouncement('Turno do Dealer...');
    this.updateUI();

    // Revela a carta oculta do dealer
    await this.sleep(500);
    const hiddenCard = this.dealerCards.find(c => c.isFaceDown);
    if (hiddenCard) {
      hiddenCard.isFaceDown = false;
      this.sounds.playCard();
      this.renderCards();
    }

    // Verifica se TODAS as mãos do jogador estouraram OU se o único jogador tem Blackjack natural
    const allHandsBusted = this.playerHands.every(h => h.getScore().isBust);
    const hasNaturalBlackjack = this.playerHands.length === 1 && this.playerHands[0].status === 'blackjack';

    if (!allHandsBusted && !hasNaturalBlackjack) {
      // Dealer deve comprar até atingir 17 ou mais
      while (this.getDealerScore().total < 17) {
        await this.sleep(800);
        const card = this.deck.draw(false);
        this.dealerCards.push(card);
        this.sounds.playCard();
        this.renderCards();
      }
    }

    await this.sleep(600);
    this.resolveGame();
  }

  getDealerScore() {
    let total = 0;
    let aces = 0;
    for (const card of this.dealerCards) {
      if (card.isFaceDown) continue;
      total += card.value;
      if (card.isAce) aces++;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    const isBust = total > 21;
    const isBlackjack = this.dealerCards.length === 2 && total === 21;
    return { total, isBust, isBlackjack };
  }

  // Resolução de pagamentos e resultados
  resolveGame() {
    this.phase = 'ended';
    const dealerScore = this.getDealerScore();
    let totalNetGain = 0;
    let hasWin = false;
    let hasBlackjack = false;

    this.playerHands.forEach((hand, idx) => {
      const pScore = hand.getScore();
      const prefix = this.playerHands.length > 1 ? `Mão ${idx + 1}: ` : '';

      if (pScore.isBust) {
        hand.result = 'bust';
        hand.resultMessage = `${prefix}Estourou (-$${hand.bet})`;
      } else if (pScore.isBlackjack) {
        if (dealerScore.isBlackjack) {
          // Empate de Blackjack
          this.bankroll += hand.bet;
          hand.result = 'push';
          hand.resultMessage = `${prefix}Empate de Blackjack`;
        } else {
          // Blackjack paga 3:2 (150% de lucro + devolução da aposta)
          const payout = Math.floor(hand.bet * 2.5);
          const profit = payout - hand.bet;
          this.bankroll += payout;
          totalNetGain += profit;
          hand.result = 'blackjack';
          hand.resultMessage = `${prefix}Blackjack! (+$${profit})`;
          hasBlackjack = true;
          hasWin = true;
        }
      } else if (dealerScore.isBust) {
        // Dealer estourou, jogador vence 1:1
        const payout = hand.bet * 2;
        this.bankroll += payout;
        totalNetGain += hand.bet;
        hand.result = 'win';
        hand.resultMessage = `${prefix}Dealer Estourou! (+$${hand.bet})`;
        hasWin = true;
      } else if (dealerScore.isBlackjack) {
        hand.result = 'lose';
        hand.resultMessage = `${prefix}Dealer tem Blackjack (-$${hand.bet})`;
      } else if (pScore.total > dealerScore.total) {
        // Jogador tem pontuação maior
        const payout = hand.bet * 2;
        this.bankroll += payout;
        totalNetGain += hand.bet;
        hand.result = 'win';
        hand.resultMessage = `${prefix}Vitória! (+$${hand.bet})`;
        hasWin = true;
      } else if (pScore.total === dealerScore.total) {
        // Empate (Push)
        this.bankroll += hand.bet;
        hand.result = 'push';
        hand.resultMessage = `${prefix}Empate (Push)`;
      } else {
        // Dealer maior
        hand.result = 'lose';
        hand.resultMessage = `${prefix}Dealer Venceu (-$${hand.bet})`;
      }
    });

    // Sons de desfecho
    if (hasBlackjack) {
      this.sounds.playBlackjack();
    } else if (hasWin) {
      this.sounds.playWin();
    } else if (this.playerHands.some(h => h.result === 'push')) {
      this.sounds.playChip();
    } else {
      this.sounds.playBust();
    }

    // Mensagem principal
    if (hasBlackjack) {
      this.showAnnouncement('🌟 BLACKJACK! Parabéns!');
    } else if (totalNetGain > 0) {
      this.showAnnouncement(`🎉 Você ganhou $${totalNetGain}!`);
    } else if (this.playerHands.every(h => h.result === 'push')) {
      this.showAnnouncement('Empate! Suas apostas foram devolvidas.');
    } else {
      this.showAnnouncement('A banca venceu a rodada. Nova aposta?');
    }

    // Salva última aposta para o botão "Repetir"
    const playedBet = this.playerHands.reduce((acc, h) => acc + h.bet, 0);
    if (playedBet > 0) {
      this.lastBet = playedBet;
    }

    // Retorna para aposta
    this.currentBet = 0;
    this.phase = 'betting';
    this.updateUI();
  }

  // --------------------------------------------------------------------------
  // RENDERIZAÇÃO DA INTERFACE (DOM & Cartas 3D)
  // --------------------------------------------------------------------------
  renderCards() {
    // 1. Renderiza Dealer
    this.dom.dealerCards.innerHTML = '';
    this.dealerCards.forEach(card => {
      this.dom.dealerCards.appendChild(this.createCardElement(card));
    });

    // Score do Dealer
    const hasHidden = this.dealerCards.some(c => c.isFaceDown);
    const dScore = this.getDealerScore();
    if (this.dealerCards.length === 0) {
      this.dom.dealerScore.textContent = '--';
      this.dom.dealerScoreBadge.className = 'score-badge';
    } else if (hasHidden) {
      this.dom.dealerScore.textContent = '?';
      this.dom.dealerScoreBadge.className = 'score-badge';
    } else {
      this.dom.dealerScore.textContent = dScore.total;
      if (dScore.isBust) {
        this.dom.dealerScoreBadge.className = 'score-badge bust';
        this.dom.dealerScore.textContent = `${dScore.total} (ESTOUROU)`;
      } else if (dScore.isBlackjack) {
        this.dom.dealerScoreBadge.className = 'score-badge blackjack';
        this.dom.dealerScore.textContent = '21 (BLACKJACK)';
      } else {
        this.dom.dealerScoreBadge.className = 'score-badge';
      }
    }

    // 2. Renderiza Mãos do Jogador
    this.dom.playerHandsContainer.innerHTML = '';
    const isSplitMode = this.playerHands.length > 1;

    this.playerHands.forEach((hand, idx) => {
      const score = hand.getScore();
      const isActive = this.phase === 'player-turn' && this.activeHandIndex === idx;

      const handBox = document.createElement('div');
      handBox.className = `hand-box ${isSplitMode ? 'split-mode' : ''} ${isActive ? 'is-active' : ''} ${!isActive && isSplitMode ? 'is-inactive' : ''}`;

      // Tag de mão ativa
      if (isActive && isSplitMode) {
        const activeTag = document.createElement('div');
        activeTag.className = 'active-indicator-tag';
        activeTag.textContent = 'MÃO ATIVA';
        handBox.appendChild(activeTag);
      }

      // Cabeçalho da mão
      const header = document.createElement('div');
      header.className = 'hand-header';

      const title = document.createElement('span');
      title.className = 'dealer-badge';
      title.textContent = isSplitMode ? `MÃO ${idx + 1}` : 'SUA MÃO';

      const betTag = document.createElement('span');
      betTag.className = 'hand-bet-tag';
      betTag.textContent = `$${hand.bet}`;

      const scoreBadge = document.createElement('div');
      scoreBadge.className = `score-badge ${score.isBust ? 'bust' : ''} ${score.isBlackjack ? 'blackjack' : ''}`;
      scoreBadge.textContent = score.isBust ? `${score.total} (ESTOUROU)` : score.isBlackjack ? '21 (BLACKJACK)' : score.total;

      header.appendChild(title);
      header.appendChild(betTag);
      header.appendChild(scoreBadge);
      handBox.appendChild(header);

      // Wrapper de Cartas
      const cardsWrap = document.createElement('div');
      cardsWrap.className = 'cards-wrapper';
      hand.cards.forEach(card => {
        cardsWrap.appendChild(this.createCardElement(card));
      });
      handBox.appendChild(cardsWrap);

      // Mensagem de status da mão
      if (hand.resultMessage) {
        const msg = document.createElement('div');
        msg.className = `hand-status-msg ${hand.result}`;
        msg.textContent = hand.resultMessage;
        handBox.appendChild(msg);
      }

      this.dom.playerHandsContainer.appendChild(handBox);
    });
  }

  // Cria elemento HTML da carta com estrutura 3D
  createCardElement(card) {
    const cardItem = document.createElement('div');
    // Se a carta estiver virada para baixo (faceDown), adiciona a classe .is-flipped que gira 180deg para mostrar o verso
    cardItem.className = `card-item ${card.isFaceDown ? 'is-flipped' : ''}`;

    const suitClass = `suit-${card.suit}`;

    let centerContent = '';
    if (card.isRoyal) {
      centerContent = `<div class="center-royal">${card.rank}</div>`;
    } else {
      centerContent = `<div class="center-suit">${card.symbol}</div>`;
    }

    cardItem.innerHTML = `
      <div class="card-inner">
        <!-- Frente da Carta -->
        <div class="card-face card-front ${suitClass}">
          <div class="card-corner top">
            <span class="card-rank">${card.rank}</span>
            <span class="card-suit">${card.symbol}</span>
          </div>
          <div class="card-center">
            ${centerContent}
          </div>
          <div class="card-corner bottom">
            <span class="card-rank">${card.rank}</span>
            <span class="card-suit">${card.symbol}</span>
          </div>
        </div>
        <!-- Verso da Carta -->
        <div class="card-face card-back">
          <div class="card-back-pattern"></div>
        </div>
      </div>
    `;

    return cardItem;
  }

  // --------------------------------------------------------------------------
  // ATUALIZAÇÃO GERAL DO ESTADO DA INTERFACE
  // --------------------------------------------------------------------------
  updateUI() {
    this.dom.balanceDisplay.textContent = `$${this.bankroll.toLocaleString('pt-BR')}`;
    this.dom.totalBetDisplay.textContent = `$${this.currentBet.toLocaleString('pt-BR')}`;
    this.dom.betSpotAmount.textContent = `$${this.currentBet.toLocaleString('pt-BR')}`;
    this.dom.deckCountDisplay.textContent = `${this.deck.remainingCount()} cartas`;

    const isBetting = this.phase === 'betting';
    const isPlayerTurn = this.phase === 'player-turn';

    // Fichas & Ações de Aposta
    this.dom.chips.forEach(chip => {
      const val = parseInt(chip.dataset.value, 10);
      chip.disabled = !isBetting || this.bankroll < val;
    });

    this.dom.rebetBtn.disabled = !isBetting || this.lastBet === 0 || this.bankroll < this.lastBet;
    this.dom.clearBetBtn.disabled = !isBetting || this.currentBet === 0;
    this.dom.doubleBetBtn.disabled = !isBetting || this.currentBet === 0 || this.bankroll < this.currentBet;
    this.dom.allInBtn.disabled = !isBetting || this.bankroll === 0;

    // Botão Distribuir
    this.dom.dealBtn.disabled = !isBetting || this.currentBet === 0;

    // Botões In-Game
    if (isPlayerTurn) {
      const activeHand = this.getActiveHand();
      this.dom.hitBtn.disabled = !activeHand || activeHand.status !== 'playing';
      this.dom.standBtn.disabled = !activeHand || activeHand.status !== 'playing';

      // Dobrar: só na mão inicial com 2 cartas e saldo suficiente
      this.dom.doubleBtn.disabled = !activeHand || !activeHand.canDouble() || this.bankroll < activeHand.bet;

      // Dividir: somente 1 mão, 2 cartas de mesmo valor, saldo suficiente
      this.dom.splitBtn.disabled = this.playerHands.length !== 1 || !activeHand.canSplit() || this.bankroll < activeHand.bet;
    } else {
      this.dom.hitBtn.disabled = true;
      this.dom.standBtn.disabled = true;
      this.dom.doubleBtn.disabled = true;
      this.dom.splitBtn.disabled = true;
    }

    this.renderChipStackVisual();
    this.renderCards();
  }

  // Renderiza mini fichas visuais na mesa de aposta
  renderChipStackVisual() {
    this.dom.chipStackVisual.innerHTML = '';
    if (this.currentBet <= 0) return;

    let rem = this.currentBet;
    const denoms = [
      { val: 500, color: '#7e22ce' },
      { val: 100, color: '#1e293b' },
      { val: 50, color: '#dc2626' },
      { val: 25, color: '#16a34a' },
      { val: 10, color: '#2563eb' }
    ];

    let count = 0;
    for (const d of denoms) {
      while (rem >= d.val && count < 6) {
        const mini = document.createElement('span');
        mini.className = 'mini-chip';
        mini.style.background = d.color;
        this.dom.chipStackVisual.appendChild(mini);
        rem -= d.val;
        count++;
      }
    }
  }

  showAnnouncement(text) {
    this.dom.announcementText.textContent = text;
    this.dom.announcementBanner.classList.remove('highlight');
    void this.dom.announcementBanner.offsetWidth; // Trigger reflow
    this.dom.announcementBanner.classList.add('highlight');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Inicializa o jogo ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  window.blackjackGame = new BlackjackGame();
});
