// 🎮 CAR VS ZOMBIES - ALMACENAMIENTO
// Manejo de datos del jugador y logros

import { STORAGE_KEY, ACHIEVEMENTS_KEY, SHOP_COLORS, UPGRADES } from './config.js';

export class StorageManager {
  constructor() {
    this.playerData = this.loadPlayerData();
    this.achievementData = this.loadAchievements();
  }

  loadPlayerData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        // Migrar datos antiguos si es necesario
        if (!data.upgrades) {
          data.upgrades = {};
          UPGRADES.forEach(u => data.upgrades[u.id] = 0);
        }
        if (!data.unlockedColors) {
          data.unlockedColors = [0];
        }
        return data;
      }
    } catch (e) {
      console.warn('Error cargando datos:', e);
    }

    // Datos por defecto
    const upgrades = {};
    UPGRADES.forEach(u => upgrades[u.id] = 0);
    
    return {
      coins: 0,
      totalCoins: 0,
      bestScore: 0,
      totalKills: 0,
      gamesPlayed: 0,
      selectedColor: 0,
      unlockedColors: [0],
      upgrades: upgrades,
      totalPlayTime: 0,
    };
  }

  savePlayerData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.playerData));
    } catch (e) {
      console.error('Error guardando datos:', e);
    }
  }

  loadAchievements() {
    try {
      const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Error cargando logros:', e);
      return {};
    }
  }

  saveAchievements() {
    try {
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(this.achievementData));
    } catch (e) {
      console.error('Error guardando logros:', e);
    }
  }

  unlockAchievement(achievementId, achievement) {
    if (!this.achievementData[achievementId]) {
      this.achievementData[achievementId] = {
        unlocked: true,
        timestamp: Date.now(),
      };
      this.saveAchievements();
      return true;
    }
    return false;
  }

  isAchievementUnlocked(achievementId) {
    return this.achievementData[achievementId]?.unlocked || false;
  }

  addCoins(amount) {
    this.playerData.coins += amount;
    this.playerData.totalCoins += amount;
    this.savePlayerData();
  }

  spendCoins(amount) {
    if (this.playerData.coins >= amount) {
      this.playerData.coins -= amount;
      this.savePlayerData();
      return true;
    }
    return false;
  }

  unlockColor(index) {
    if (!this.playerData.unlockedColors.includes(index)) {
      this.playerData.unlockedColors.push(index);
      this.savePlayerData();
      return true;
    }
    return false;
  }

  selectColor(index) {
    this.playerData.selectedColor = index;
    this.savePlayerData();
  }

  upgradeLevel(upgradeId) {
    if (!this.playerData.upgrades[upgradeId]) {
      this.playerData.upgrades[upgradeId] = 0;
    }
    this.playerData.upgrades[upgradeId]++;
    this.savePlayerData();
  }

  getUpgradeLevel(upgradeId) {
    return this.playerData.upgrades[upgradeId] || 0;
  }

  updateStats(stats) {
    if (stats.score > this.playerData.bestScore) {
      this.playerData.bestScore = stats.score;
    }
    this.playerData.totalKills += stats.kills || 0;
    this.playerData.gamesPlayed++;
    this.savePlayerData();
  }
}
