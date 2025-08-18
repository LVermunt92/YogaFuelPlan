/**
 * Test suite for the protein range calculator
 * Based on the provided test cases and integrated with meal planning app
 */

import { proteinRangePerDay, calculateProteinTarget, getDetailedProteinRecommendation } from "../proteinRange";

describe("proteinRangePerDay", () => {
  test("auto, <50y, moderate, 60 kg → ~[72, 96]", () => {
    const out = proteinRangePerDay(32, 60, "moderate", "maintenance", "auto");
    expect(out.protein_range_g_per_day[0]).toBeGreaterThanOrEqual(70);
    expect(out.protein_range_g_per_day[0]).toBeLessThanOrEqual(75);
    expect(out.protein_range_g_per_day[1]).toBeGreaterThanOrEqual(95);
    expect(out.protein_range_g_per_day[1]).toBeLessThanOrEqual(100);
  });

  test("≥50y, athlete, 60 kg, auto → upper bound ≤ 132 g (2.2/kg cap)", () => {
    const out = proteinRangePerDay(55, 60, "athlete", "maintenance", "auto");
    expect(out.protein_range_g_per_day[1]).toBeLessThanOrEqual(132);
  });

  test("bulletproof_moderate, 60 kg → [48, 72]", () => {
    const out = proteinRangePerDay(32, 60, "light", "maintenance", "bulletproof_moderate");
    expect(out.protein_range_g_per_day).toEqual([48, 72]);
  });

  test("goal bias nudges low end upward but preserves range semantics", () => {
    const out = proteinRangePerDay(32, 60, "moderate", "muscle_gain", "auto");
    // base would be 1.2–1.6 → 72–96, nudge may lift low to ~75
    expect(out.protein_range_g_per_day[0]).toBeGreaterThanOrEqual(70);
    expect(out.protein_range_g_per_day[0]).toBeLessThanOrEqual(80);
    expect(out.protein_range_g_per_day[1]).toBeGreaterThanOrEqual(95);
    expect(out.protein_range_g_per_day[1]).toBeLessThanOrEqual(105);
  });

  test("caps extremely high outputs", () => {
    const out = proteinRangePerDay(28, 80, "athlete", "muscle_gain", "sport_high");
    expect(out.protein_range_g_per_day[1]).toBeLessThanOrEqual(176); // 2.2 * 80 = 176
  });

  test("invalid inputs throw", () => {
    expect(() => proteinRangePerDay(0, 60, "moderate", "maintenance", "auto")).toThrow();
    expect(() => proteinRangePerDay(30, 0, "moderate", "maintenance", "auto")).toThrow();
  });

  test("age adjustment for men 50+ years increases protein requirements", () => {
    const young = proteinRangePerDay(30, 60, "moderate", "maintenance", "auto", "male");
    const older = proteinRangePerDay(55, 60, "moderate", "maintenance", "auto", "male");
    
    expect(older.protein_range_g_per_day[0]).toBeGreaterThanOrEqual(young.protein_range_g_per_day[0]);
    expect(older.age_adjusted).toBe(true);
    expect(young.age_adjusted).toBe(false);
  });

  test("age adjustment for women 45+ years increases protein requirements", () => {
    const young = proteinRangePerDay(30, 60, "moderate", "maintenance", "auto", "female");
    const older = proteinRangePerDay(47, 60, "moderate", "maintenance", "auto", "female");
    
    expect(older.protein_range_g_per_day[0]).toBeGreaterThanOrEqual(young.protein_range_g_per_day[0]);
    expect(older.age_adjusted).toBe(true);
    expect(young.age_adjusted).toBe(false);
  });

  test("no age adjustment for men under 50", () => {
    const result = proteinRangePerDay(48, 60, "moderate", "maintenance", "auto", "male");
    expect(result.age_adjusted).toBe(false);
  });

  test("no age adjustment for women under 45", () => {
    const result = proteinRangePerDay(43, 60, "moderate", "maintenance", "auto", "female");
    expect(result.age_adjusted).toBe(false);
  });
});

describe("calculateProteinTarget - backward compatibility", () => {
  test("maintains compatibility with existing meal planner system", () => {
    // Test with high activity (should map to moderate)
    const highActivity = calculateProteinTarget(35, "high");
    expect(highActivity).toBeGreaterThan(70);
    expect(highActivity).toBeLessThan(120);
    
    // Test with low activity (should map to light)
    const lowActivity = calculateProteinTarget(35, "low");
    expect(lowActivity).toBeGreaterThan(50);
    expect(lowActivity).toBeLessThan(90);
    
    // High activity should give higher protein than low activity
    expect(highActivity).toBeGreaterThan(lowActivity);
  });

  test("handles null age gracefully", () => {
    const result = calculateProteinTarget(null, "high");
    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe("number");
  });
});

describe("getDetailedProteinRecommendation", () => {
  test("provides comprehensive protein recommendation", () => {
    const recommendation = getDetailedProteinRecommendation(
      35, 
      70, 
      "high", 
      ["vegetarian"]
    );
    
    expect(recommendation.recommended).toBeGreaterThan(0);
    expect(recommendation.range[0]).toBeLessThan(recommendation.range[1]);
    expect(recommendation.explanation).toContain("strategy");
    expect(recommendation.strategy).toBe("auto");
  });

  test("adjusts for muscle gain goals", () => {
    const maintenance = getDetailedProteinRecommendation(30, 70, "high", []);
    const muscleGain = getDetailedProteinRecommendation(30, 70, "high", ["muscle_gain"]);
    
    expect(muscleGain.recommended).toBeGreaterThanOrEqual(maintenance.recommended);
    expect(muscleGain.range[0]).toBeGreaterThanOrEqual(maintenance.range[0]);
  });

  test("considers weight in calculations", () => {
    const lighter = getDetailedProteinRecommendation(30, 50, "high", []);
    const heavier = getDetailedProteinRecommendation(30, 80, "high", []);
    
    expect(heavier.recommended).toBeGreaterThan(lighter.recommended);
  });
});