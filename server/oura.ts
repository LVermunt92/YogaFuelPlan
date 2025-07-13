import axios from 'axios';
import { InsertOuraData, OuraData } from '@shared/schema';

const OURA_API_BASE = 'https://api.ouraring.com/v2';

export class OuraService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get daily activity data from Oura API
   */
  async getDailyActivity(startDate: string, endDate?: string): Promise<any[]> {
    try {
      const params: any = { start_date: startDate };
      if (endDate) {
        params.end_date = endDate;
      }

      const response = await axios.get(
        `${OURA_API_BASE}/usercollection/daily_activity`,
        {
          headers: this.getHeaders(),
          params
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching Oura daily activity:', error);
      throw new Error('Failed to fetch activity data from Oura');
    }
  }

  /**
   * Get readiness data from Oura API
   */
  async getReadiness(startDate: string, endDate?: string): Promise<any[]> {
    try {
      const params: any = { start_date: startDate };
      if (endDate) {
        params.end_date = endDate;
      }

      const response = await axios.get(
        `${OURA_API_BASE}/usercollection/daily_readiness`,
        {
          headers: this.getHeaders(),
          params
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching Oura readiness:', error);
      throw new Error('Failed to fetch readiness data from Oura');
    }
  }

  /**
   * Get sleep data from Oura API
   */
  async getSleep(startDate: string, endDate?: string): Promise<any[]> {
    try {
      const params: any = { start_date: startDate };
      if (endDate) {
        params.end_date = endDate;
      }

      const response = await axios.get(
        `${OURA_API_BASE}/usercollection/daily_sleep`,
        {
          headers: this.getHeaders(),
          params
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching Oura sleep:', error);
      throw new Error('Failed to fetch sleep data from Oura');
    }
  }

  /**
   * Get workout/session data from Oura API
   */
  async getWorkouts(startDate: string, endDate?: string): Promise<any[]> {
    try {
      const params: any = { start_date: startDate };
      if (endDate) {
        params.end_date = endDate;
      }

      const response = await axios.get(
        `${OURA_API_BASE}/usercollection/workout`,
        {
          headers: this.getHeaders(),
          params
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching Oura workouts:', error);
      return []; // Workouts are optional, return empty array if error
    }
  }

  /**
   * Transform Oura API data into our database format
   */
  async transformOuraData(userId: number, date: string): Promise<InsertOuraData> {
    const [activityData, readinessData, sleepData, workouts] = await Promise.all([
      this.getDailyActivity(date, date),
      this.getReadiness(date, date),
      this.getSleep(date, date),
      this.getWorkouts(date, date)
    ]);

    const activity = activityData[0] || {};
    const readiness = readinessData[0] || {};
    const sleep = sleepData[0] || {};
    
    // Calculate total workout minutes for the day
    const workoutMinutes = workouts.reduce((total: number, workout: any) => {
      return total + (workout.duration || 0);
    }, 0) / 60; // Convert seconds to minutes

    // Determine activity level based on activity score and steps
    const activityLevel = this.calculateActivityLevel(
      activity.score,
      activity.steps,
      workoutMinutes
    );

    // Estimate menstrual cycle phase (placeholder - would need additional data)
    const periodPhase = this.estimatePeriodPhase(readiness, sleep);

    return {
      userId,
      date,
      activityScore: activity.score || null,
      steps: activity.steps || null,
      calories: activity.equivalent_walking_distance || null,
      activeCalories: activity.active_calories || null,
      workoutMinutes: Math.round(workoutMinutes) || null,
      readinessScore: readiness.score || null,
      sleepScore: sleep.score || null,
      periodPhase,
      activityLevel
    };
  }

  /**
   * Calculate activity level based on Oura metrics
   */
  private calculateActivityLevel(
    activityScore?: number,
    steps?: number,
    workoutMinutes?: number
  ): 'high' | 'low' {
    // High activity thresholds:
    // - Activity score > 75
    // - Steps > 8000
    // - Workout minutes > 30
    
    if (!activityScore && !steps && !workoutMinutes) {
      return 'low'; // Default to low if no data
    }

    const highActivityIndicators = [
      (activityScore || 0) > 75,
      (steps || 0) > 8000,
      (workoutMinutes || 0) > 30
    ];

    // If 2 or more indicators suggest high activity
    const highActivityCount = highActivityIndicators.filter(Boolean).length;
    return highActivityCount >= 2 ? 'high' : 'low';
  }

  /**
   * Estimate menstrual cycle phase based on readiness and sleep patterns
   * Note: This is a basic estimation. Real cycle tracking would need more data
   */
  private estimatePeriodPhase(readiness: any, sleep: any): string | null {
    // This is a placeholder implementation
    // Real cycle tracking would need:
    // - Body temperature data
    // - Heart rate variability
    // - User-inputted cycle data
    // - Longer-term pattern analysis
    
    const readinessScore = readiness.score || 0;
    const sleepScore = sleep.score || 0;
    
    // Very basic estimation based on scores
    if (readinessScore < 70 && sleepScore < 70) {
      return 'menstrual'; // Lower scores might indicate menstrual phase
    } else if (readinessScore > 85) {
      return 'ovulation'; // Higher readiness around ovulation
    }
    
    return null; // Unknown/undefined phase
  }

  /**
   * Test connection to Oura API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${OURA_API_BASE}/usercollection/personal_info`,
        { headers: this.getHeaders() }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error('Oura connection test failed:', error);
      return false;
    }
  }
}