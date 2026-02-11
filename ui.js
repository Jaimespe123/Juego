// 🎮 CAR VS ZOMBIES - UI MANAGER
// Manejo de interfaz de usuario, menús y HUD

import { SHOP_COLORS, UPGRADES, ACHIEVEMENTS, ZOMBIE_TYPES, POWERUP_TYPES } from './config.js';

export class UIManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.elements = this.initElements();
    this.setupEventListeners();
  }

  initElements() {
    return {
      container:          document.getElementById('container'),
      overlayMenu:        document.getElementById('overlayMenu'),
      overlayShop:        document.getElementById('overlayShop'),
      overlayGameOver:    document.getElementById('overlayGameOver'),
      overlayZombieInfo:  document.getElementById('overlayZombieInfo'),
      overlayAchievements: document.getElementById('overlayAchievements'),
      overlayLeaderboard: document.getElementById('overlayLeaderboard'),
      startBtn:           document.getElementById('startBtn'),
      playAgain:          document.getElementById('playAgain'),
      toMenu:             document.getElementById('toMenu'),
      btnOpenMenu:        document.getElementById('btnOpenMenu'),
      btnSettings:        document.getElementById('btnSettings'),
      btnRestart:         document.getElementById('btnRestart'),
      openSettings:       document.getElementById('openSettings'),
      openShop:           document.getElementById('openShop'),
      openZombieInfo:     document.getElementById('openZombieInfo'),
      openAchievements:   document.getElementById('openAchievements'),
      openLeaderboard:    document.getElementById('openLeaderboard'),
      backFromShop:       document.getElementById('backFromShop'),
      backFromZombieInfo: document.getElementById('backFromZombieInfo'),
      backFromAchievements: document.getElementById('backFromAchievements'),
      backFromLeaderboard: document.getElementById('backFromLeaderboard'),
      settingsPanel:      document.getElementById('settingsPanel'),
      closeSettings:      document.getElementById('closeSettings'),
      scoreEl:            document.getElementById('score'),
      hpEl:               document.getElementById('hp'),
      speedEl:            document.getElementById('speed'),
      coinsEl:            document.getElementById('coins'),
      comboEl:            document.getElementById('combo'),
      waveEl:             document.getElementById('wave'),
      fpsEl:              document.getElementById('fps'),
      nitroBar:           document.getElementById('nitroBar'),
      volMaster:          document.getElementById('volMaster'),
      volEngine:          document.getElementById('volEngine'),
      volSfx:             document.getElementById('volSfx'),
      volMasterVal:       document.getElementById('volMasterVal'),
      volEngineVal:       document.getElementById('volEngineVal'),
      volSfxVal:          document.getElementById('volSfxVal'),
      mouseSensitivity:   document.getElementById('mouseSensitivity'),
      mouseSensitivityVal: document.getElementById('mouseSensitivityVal'),
      inGameMsg:          document.getElementById('inGameMsg'),
      shopCoinsDisplay:   document.getElementById('shopCoinsDisplay'),
      shopGrid:           document.getElementById('shopGrid'),
      upgradesGrid:       document.getElementById('upgradesGrid'),
      goTitle:            document.getElementById('goTitle'),
      goScore:            document.getElementById('goScore'),
      goCoins:            document.getElementById('goCoins'),
      goKills:            document.getElementById('goKills'),
      goMaxCombo:         document.getElementById('goMaxCombo'),
      powerupContainer:   document.getElementById('powerupContainer'),
      menuBestScore:      document.getElementById('menuBestScore'),
      menuCoins:          document.getElementById('menuCoins'),
      menuGames:          document.getElementById('menuGames'),
      achievementsGrid:   document.getElementById('achievementsGrid'),
    };
  }

  setupEventListeners() {
    // Menú principal
    if (this.elements.openShop) {
      this.elements.openShop.addEventListener('click', () => this.showShop());
    }
    if (this.elements.backFromShop) {
      this.elements.backFromShop.addEventListener('click', () => this.hideShop());
    }
    if (this.elements.openZombieInfo) {
      this.elements.openZombieInfo.addEventListener('click', () => this.showZombieInfo());
    }
    if (this.elements.backFromZombieInfo) {
      this.elements.backFromZombieInfo.addEventListener('click', () => this.hideZombieInfo());
    }
    if (this.elements.openAchievements) {
      this.elements.openAchievements.addEventListener('click', () => this.showAchievements());
    }
    if (this.elements.backFromAchievements) {
      this.elements.backFromAchievements.addEventListener('click', () => this.hideAchievements());
    }
    if (this.elements.openLeaderboard) {
      this.elements.openLeaderboard.addEventListener('click', () => this.showLeaderboard());
    }
    if (this.elements.backFromLeaderboard) {
      this.elements.backFromLeaderboard.addEventListener('click', () => this.hideLeaderboard());
    }

    // Ajustes
    if (this.elements.openSettings || this.elements.btnSettings) {
      const openSettingsBtn = this.elements.openSettings || this.elements.btnSettings;
      openSettingsBtn.addEventListener('click', () => this.showSettings());
    }
    if (this.elements.closeSettings) {
      this.elements.closeSettings.addEventListener('click', () => this.hideSettings());
    }

    // Configuración de volúmenes
    this.setupVolumeControls();
    this.setupMouseSensitivity();
  }

  setupVolumeControls() {
    const updateVolume = (slider, display, callback) => {
      if (!slider || !display) return;
      slider.addEventListener('input', () => {
        const val = Math.round(slider.value * 100);
        display.textContent = val + '%';
        if (callback) callback(parseFloat(slider.value));
      });
    };

    updateVolume(this.elements.volMaster, this.elements.volMasterVal);
    updateVolume(this.elements.volEngine, this.elements.volEngineVal);
    updateVolume(this.elements.volSfx, this.elements.volSfxVal);
  }

  setupMouseSensitivity() {
    if (!this.elements.mouseSensitivity || !this.elements.mouseSensitivityVal) return;
    
    this.elements.mouseSensitivity.addEventListener('input', () => {
      const val = Math.round(this.elements.mouseSensitivity.value * 100);
      this.elements.mouseSensitivityVal.textContent = val + '%';
    });
  }

  // Mostrar/ocultar elementos
  showMenu() {
    if (this.elements.overlayMenu) {
      this.elements.overlayMenu.style.display = 'block';
    }
    this.hideHUD();
    this.showBackgroundCanvas();
    this.updateMenuStats();
  }

  hideMenu() {
    if (this.elements.overlayMenu) {
      this.elements.overlayMenu.style.display = 'none';
    }
    this.hideBackgroundCanvas();
  }

  showShop() {
    this.hideMenu();
    if (this.elements.overlayShop) {
      this.elements.overlayShop.style.display = 'block';
    }
    this.renderShop();
  }

  hideShop() {
    if (this.elements.overlayShop) {
      this.elements.overlayShop.style.display = 'none';
    }
    this.showMenu();
  }

  showZombieInfo() {
    this.hideMenu();
    if (this.elements.overlayZombieInfo) {
      this.elements.overlayZombieInfo.style.display = 'block';
    }
  }

  hideZombieInfo() {
    if (this.elements.overlayZombieInfo) {
      this.elements.overlayZombieInfo.style.display = 'none';
    }
    this.showMenu();
  }

  showAchievements() {
    this.hideMenu();
    if (this.elements.overlayAchievements) {
      this.elements.overlayAchievements.style.display = 'block';
    }
    this.renderAchievements();
  }

  hideAchievements() {
    if (this.elements.overlayAchievements) {
      this.elements.overlayAchievements.style.display = 'none';
    }
    this.showMenu();
  }

  showLeaderboard() {
    this.hideMenu();
    if (this.elements.overlayLeaderboard) {
      this.elements.overlayLeaderboard.style.display = 'block';
    }
    this.renderLeaderboard();
  }

  hideLeaderboard() {
    if (this.elements.overlayLeaderboard) {
      this.elements.overlayLeaderboard.style.display = 'none';
    }
    this.showMenu();
  }

  showSettings() {
    if (this.elements.settingsPanel) {
      this.elements.settingsPanel.style.display = 'block';
    }
  }

  hideSettings() {
    if (this.elements.settingsPanel) {
      this.elements.settingsPanel.style.display = 'none';
    }
  }

  showGameOver(stats) {
    if (this.elements.overlayGameOver) {
      this.elements.overlayGameOver.style.display = 'block';
    }
    if (this.elements.goScore) this.elements.goScore.textContent = stats.score || 0;
    if (this.elements.goCoins) this.elements.goCoins.textContent = stats.coins || 0;
    if (this.elements.goKills) this.elements.goKills.textContent = stats.kills || 0;
    if (this.elements.goMaxCombo) this.elements.goMaxCombo.textContent = 'x' + (stats.maxCombo || 1);
  }

  hideGameOver() {
    if (this.elements.overlayGameOver) {
      this.elements.overlayGameOver.style.display = 'none';
    }
  }

  showHUD() {
    const hud = document.getElementById('hud');
    const minimap = document.getElementById('minimap');
    const topRight = document.getElementById('topRight');
    if (hud) hud.style.display = 'block';
    if (minimap) minimap.style.display = 'block';
    if (topRight) topRight.style.display = 'flex';
    if (this.elements.powerupContainer) this.elements.powerupContainer.style.display = 'flex';
  }

  hideHUD() {
    const hud = document.getElementById('hud');
    const minimap = document.getElementById('minimap');
    const topRight = document.getElementById('topRight');
    if (hud) hud.style.display = 'none';
    if (minimap) minimap.style.display = 'none';
    if (topRight) topRight.style.display = 'none';
    if (this.elements.powerupContainer) this.elements.powerupContainer.style.display = 'none';
  }

  showBackgroundCanvas() {
    const bgCanvas = document.getElementById('bgCanvas');
    if (bgCanvas) bgCanvas.style.display = 'block';
  }

  hideBackgroundCanvas() {
    const bgCanvas = document.getElementById('bgCanvas');
    if (bgCanvas) bgCanvas.style.display = 'none';
  }

  // Actualizar HUD
  updateHUD(gameState, carState) {
    if (this.elements.scoreEl) this.elements.scoreEl.textContent = Math.floor(gameState.score);
    if (this.elements.hpEl) this.elements.hpEl.textContent = Math.max(0, Math.floor(gameState.hp));
    if (this.elements.coinsEl) this.elements.coinsEl.textContent = this.storage.playerData.coins;
    if (this.elements.waveEl) this.elements.waveEl.textContent = gameState.wave;

    // Velocidad
    if (this.elements.speedEl && carState.velocity) {
      const speed = carState.velocity.length();
      const kmh = Math.floor(speed * 200);
      this.elements.speedEl.textContent = kmh + ' km/h';
    }

    // Combo
    if (this.elements.comboEl) {
      if (gameState.combo > 1) {
        this.elements.comboEl.textContent = 'x' + gameState.combo;
        this.elements.comboEl.style.display = 'block';
      } else {
        this.elements.comboEl.style.display = 'none';
      }
    }

    // Nitro bar
    if (this.elements.nitroBar) {
      const nitroPct = (carState.nitro / carState.maxNitro) * 100;
      this.elements.nitroBar.style.width = nitroPct + '%';
    }
  }

  updateFPS(fps) {
    if (this.elements.fpsEl) {
      this.elements.fpsEl.textContent = Math.round(fps);
    }
  }

  // Mensajes en juego
  showInGameMessage(text, duration = 2000) {
    if (!this.elements.inGameMsg) return;
    this.elements.inGameMsg.textContent = text;
    this.elements.inGameMsg.style.display = 'block';
    this.elements.inGameMsg.style.animation = 'none';
    setTimeout(() => {
      this.elements.inGameMsg.style.animation = 'slideInDown 0.3s ease';
    }, 10);
    setTimeout(() => {
      this.elements.inGameMsg.style.display = 'none';
    }, duration);
  }

  // Actualizar estadísticas del menú
  updateMenuStats() {
    if (this.elements.menuBestScore) {
      this.elements.menuBestScore.textContent = this.storage.playerData.bestScore;
    }
    if (this.elements.menuCoins) {
      this.elements.menuCoins.textContent = this.storage.playerData.coins;
    }
    if (this.elements.menuGames) {
      this.elements.menuGames.textContent = this.storage.playerData.gamesPlayed;
    }
  }

  renderLeaderboard() {
    const leaderboardContent = document.getElementById('leaderboardContent');
    if (!leaderboardContent) return;

    const stats = this.storage.playerData;
    const rows = [
      { icon: '🏆', label: 'Mejor puntuación', value: stats.bestScore || 0 },
      { icon: '💰', label: 'Monedas totales', value: stats.totalCoins || 0 },
      { icon: '🎯', label: 'Zombies eliminados', value: stats.totalKills || 0 },
      { icon: '🎮', label: 'Partidas jugadas', value: stats.gamesPlayed || 0 },
    ];

    leaderboardContent.innerHTML = `
      <div style="display:grid;gap:10px;margin:12px 0;">
        ${rows.map((row, idx) => `
          <div class="lb-row" style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.04);padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.08);">
            <span style="opacity:.9">${idx + 1}. ${row.icon} ${row.label}</span>
            <strong style="color:var(--accent)">${row.value}</strong>
          </div>
        `).join('')}
      </div>
      <p style="color:var(--muted);font-size:13px;">Consejo: mejora tu coche en la tienda para escalar más rápido.</p>
    `;
  }

  // Renderizar tienda
  renderShop() {
    if (this.elements.shopCoinsDisplay) {
      this.elements.shopCoinsDisplay.textContent = this.storage.playerData.coins;
    }

    // Renderizar colores
    if (this.elements.shopGrid) {
      this.elements.shopGrid.innerHTML = '';
      SHOP_COLORS.forEach((color, index) => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        
        const unlocked = this.storage.playerData.unlockedColors.includes(index);
        const isSelected = this.storage.playerData.selectedColor === index;
        
        if (isSelected) div.classList.add('selected');
        
        div.innerHTML = `
          <div class="color-preview" style="background: #${color.hex.toString(16).padStart(6, '0')}"></div>
          <div class="color-name">${color.name}</div>
          <div class="color-price">${unlocked ? (isSelected ? '✓ Equipado' : 'Equipar') : color.price + ' 💰'}</div>
        `;
        
        div.addEventListener('click', () => this.handleColorPurchase(index, color, unlocked));
        this.elements.shopGrid.appendChild(div);
      });
    }

    // Renderizar mejoras
    if (this.elements.upgradesGrid) {
      this.elements.upgradesGrid.innerHTML = '';
      UPGRADES.forEach(upgrade => {
        const currentLevel = this.storage.getUpgradeLevel(upgrade.id);
        const nextLevel = upgrade.levels[currentLevel];
        
        const div = document.createElement('div');
        div.className = 'upgrade-item';
        div.innerHTML = `
          <div class="upgrade-icon">${upgrade.icon}</div>
          <div class="upgrade-name">${upgrade.name}</div>
          <div class="upgrade-desc">${upgrade.desc}</div>
          <div class="upgrade-level">Nivel ${currentLevel}/${upgrade.levels.length}</div>
          ${nextLevel ? `<button class="btn small">${nextLevel.cost} 💰</button>` : '<div>MAX</div>'}
        `;
        
        if (nextLevel) {
          const btn = div.querySelector('button');
          btn.addEventListener('click', () => this.handleUpgradePurchase(upgrade, currentLevel));
        }
        
        this.elements.upgradesGrid.appendChild(div);
      });
    }
  }

  handleColorPurchase(index, color, unlocked) {
    if (unlocked) {
      this.storage.selectColor(index);
      this.showInGameMessage(`Color ${color.name} equipado`, 2000);
      this.renderShop();
      // Aquí deberías también actualizar el color del coche en el juego
    } else {
      if (this.storage.spendCoins(color.price)) {
        this.storage.unlockColor(index);
        this.storage.selectColor(index);
        this.showInGameMessage(`¡Color ${color.name} desbloqueado!`, 2000);
        this.renderShop();
      } else {
        this.showInGameMessage('No tienes suficientes monedas', 2000);
      }
    }
  }

  handleUpgradePurchase(upgrade, currentLevel) {
    const nextLevel = upgrade.levels[currentLevel];
    if (!nextLevel) return;

    if (this.storage.spendCoins(nextLevel.cost)) {
      this.storage.upgradeLevel(upgrade.id);
      this.showInGameMessage(`¡${upgrade.name} mejorado!`, 2000);
      this.renderShop();
    } else {
      this.showInGameMessage('No tienes suficientes monedas', 2000);
    }
  }

  // Renderizar logros
  renderAchievements() {
    if (!this.elements.achievementsGrid) return;
    
    this.elements.achievementsGrid.innerHTML = '';
    
    Object.values(ACHIEVEMENTS).forEach(achievement => {
      const unlocked = this.storage.isAchievementUnlocked(achievement.id);
      
      const div = document.createElement('div');
      div.className = 'achievement-card' + (unlocked ? ' unlocked' : '');
      div.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-name">${achievement.name}</div>
        <div class="achievement-desc">${achievement.desc}</div>
        <div class="achievement-reward">${unlocked ? '✓ Completado' : '+' + achievement.reward + ' 💰'}</div>
      `;
      
      this.elements.achievementsGrid.appendChild(div);
    });
  }

  // Power-ups activos
  showActivePowerup(powerupType, duration) {
    if (!this.elements.powerupContainer) return;
    
    const id = 'powerup-' + powerupType.effect;
    let element = document.getElementById(id);
    
    if (!element) {
      element = document.createElement('div');
      element.id = id;
      element.className = 'active-powerup';
      element.innerHTML = `
        <div class="powerup-icon">${powerupType.icon}</div>
        <div class="powerup-timer"></div>
      `;
      this.elements.powerupContainer.appendChild(element);
    }
    
    const timerBar = element.querySelector('.powerup-timer');
    timerBar.style.width = '100%';
  }

  updatePowerupTimer(effect, remainingPct) {
    const element = document.getElementById('powerup-' + effect);
    if (element) {
      const timerBar = element.querySelector('.powerup-timer');
      timerBar.style.width = (remainingPct * 100) + '%';
      
      if (remainingPct <= 0) {
        element.remove();
      }
    }
  }
}
