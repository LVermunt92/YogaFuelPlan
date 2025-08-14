import cron from 'node-cron';
import { OuraService } from './oura';
import { storage } from './storage';

export class OuraAutoSync {
  private isRunning = false;

  constructor() {
    this.setupDailySync();
  }

  private setupDailySync() {
    // Run daily at 8:00 AM to sync previous day's data
    cron.schedule('0 8 * * *', async () => {
      await this.performDailySync();
    }, {
      timezone: "Europe/Amsterdam"
    });

    console.log('🔄 Oura auto-sync scheduled daily at 8:00 AM (Europe/Amsterdam timezone)');
  }

  async performDailySync(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ Oura sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      const ouraToken = process.env.OURA_ACCESS_TOKEN;
      
      if (!ouraToken) {
        console.log('⚠️ Oura access token not configured, skipping auto-sync');
        return;
      }

      // Get yesterday's date (Oura data is usually available the next day)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateString = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format

      console.log(`🔄 Starting automatic Oura sync for ${dateString}...`);

      const ouraService = new OuraService(ouraToken);
      
      // Test connection first
      const isConnected = await ouraService.testConnection();
      if (!isConnected) {
        console.log('❌ Oura connection test failed, skipping sync');
        return;
      }

      // Get all users who might have Oura data (for now, we'll use user ID 2 as default)
      // In a production system, you'd query all users who have Oura integration enabled
      const userId = 2;

      // Check if data for this date already exists
      const existingData = await storage.getOuraDataByDate(userId, dateString);
      if (existingData) {
        console.log(`ℹ️ Oura data for ${dateString} already exists, skipping sync`);
        return;
      }

      // Sync the data
      const ouraData = await ouraService.transformOuraData(userId, dateString);
      await storage.createOuraData(ouraData);
      
      console.log(`✅ Successfully synced Oura data for ${dateString}`);
      console.log(`📊 Activity Level: ${ouraData.activityLevel}, Steps: ${ouraData.steps}, Activity Score: ${ouraData.activityScore}`);

    } catch (error) {
      console.error('❌ Error during automatic Oura sync:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Method to manually trigger sync (useful for testing or one-off syncs)
  async manualSync(userId: number, date?: string): Promise<boolean> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const ouraToken = process.env.OURA_ACCESS_TOKEN;
      if (!ouraToken) {
        console.log('⚠️ Oura access token not configured');
        return false;
      }

      const ouraService = new OuraService(ouraToken);
      const ouraData = await ouraService.transformOuraData(userId, targetDate);
      await storage.createOuraData(ouraData);
      
      console.log(`✅ Manual Oura sync completed for ${targetDate}`);
      return true;
    } catch (error) {
      console.error('❌ Error during manual Oura sync:', error);
      return false;
    }
  }

  // Method to get sync status
  getSyncStatus(): { isRunning: boolean; nextRun: string } {
    return {
      isRunning: this.isRunning,
      nextRun: "Daily at 8:00 AM (Europe/Amsterdam)"
    };
  }
}

// Export singleton instance
export const ouraAutoSync = new OuraAutoSync();