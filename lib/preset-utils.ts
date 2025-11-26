/**
 * Utility functions for Filter Presets
 * Handles dynamic calculation of top regions and segments
 */

import type { ComparisonData, DataRecord, FilterState } from './types'

/**
 * Calculate top regions based on market value for a specific year
 * @param data - The comparison data
 * @param year - The year to evaluate (default 2024)
 * @param topN - Number of top regions to return (default 3)
 * @returns Array of top region names
 */
export function getTopRegionsByMarketValue(
  data: ComparisonData | null,
  year: number = 2024,
  topN: number = 3
): string[] {
  if (!data) {
    console.warn('⚠️ getTopRegionsByMarketValue: No data provided')
    return []
  }

  if (!data.data || !data.data.value || !data.data.value.geography_segment_matrix) {
    console.error('❌ getTopRegionsByMarketValue: Invalid data structure', {
      hasData: !!data,
      hasDataData: !!data?.data,
      hasValue: !!data?.data?.value,
      hasMatrix: !!data?.data?.value?.geography_segment_matrix
    })
    return []
  }

  // Get all value data records
  const records = data.data.value.geography_segment_matrix

  if (!Array.isArray(records) || records.length === 0) {
    console.warn('⚠️ getTopRegionsByMarketValue: No records found in geography_segment_matrix')
    return []
  }

  // Calculate total market value by geography for the specified year
  // Treat all geographies as single entities - aggregate by name
  const geographyTotals = new Map<string, number>()

  records.forEach((record: DataRecord) => {
    const geography = record.geography
    const value = record.time_series?.[year] || 0

    // Skip global level
    if (geography === 'Global') return

    // Treat all geographies as single entities - aggregate by name
    const currentTotal = geographyTotals.get(geography) || 0
    geographyTotals.set(geography, currentTotal + value)
  })

  // Sort geographies by total value and get top N
  const sortedGeographies = Array.from(geographyTotals.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by value descending
    .slice(0, topN)
    .map(([geography]) => geography)

  console.log('📊 getTopRegionsByMarketValue:', {
    year,
    topN,
    totalGeographies: geographyTotals.size,
    topRegions: sortedGeographies
  })

  return sortedGeographies
}

/**
 * Get all first-level segments for a given segment type
 * @param data - The comparison data
 * @param segmentType - The segment type to get segments for
 * @returns Array of first-level segment names
 */
export function getFirstLevelSegments(
  data: ComparisonData | null,
  segmentType: string
): string[] {
  if (!data) return []

  const segmentDimension = data.dimensions.segments[segmentType]
  if (!segmentDimension) return []

  const hierarchy = segmentDimension.hierarchy || {}
  const allSegments = segmentDimension.items || []

  // Find root segments (those that are parents but not children of any other segment)
  const allChildren = new Set(Object.values(hierarchy).flat())
  const firstLevelSegments: string[] = []

  // Add all segments that have children but are not children themselves
  Object.keys(hierarchy).forEach(parent => {
    if (!allChildren.has(parent) && hierarchy[parent].length > 0) {
      firstLevelSegments.push(parent)
    }
  })

  // Also add standalone segments that are neither parents nor children
  allSegments.forEach(segment => {
    if (!allChildren.has(segment) && !hierarchy[segment]) {
      firstLevelSegments.push(segment)
    }
  })

  return firstLevelSegments.sort()
}

/**
 * Get the first available segment type from the data
 * @param data - The comparison data
 * @returns The first segment type name or null
 */
export function getFirstSegmentType(data: ComparisonData | null): string | null {
  if (!data || !data.dimensions.segments) return null
  
  const segmentTypes = Object.keys(data.dimensions.segments)
  return segmentTypes.length > 0 ? segmentTypes[0] : null
}

/**
 * Calculate top regions based on CAGR (Compound Annual Growth Rate)
 * @param data - The comparison data
 * @param topN - Number of top regions to return (default 2)
 * @returns Array of top region names sorted by CAGR
 */
export function getTopRegionsByCAGR(
  data: ComparisonData | null,
  topN: number = 2
): string[] {
  if (!data) {
    console.warn('⚠️ getTopRegionsByCAGR: No data provided')
    return []
  }

  if (!data.data || !data.data.value || !data.data.value.geography_segment_matrix) {
    console.error('❌ getTopRegionsByCAGR: Invalid data structure')
    return []
  }

  // Get all value data records
  const records = data.data.value.geography_segment_matrix

  if (!Array.isArray(records) || records.length === 0) {
    console.warn('⚠️ getTopRegionsByCAGR: No records found')
    return []
  }

  // Calculate average CAGR for each geography
  // Treat all geographies as single entities - aggregate by name
  const geographyCAGRs = new Map<string, number[]>()

  records.forEach((record: DataRecord) => {
    const geography = record.geography

    // Skip global level
    if (geography === 'Global') return

    // Treat all geographies as single entities - aggregate by name
    if (record.cagr !== undefined && record.cagr !== null && !isNaN(record.cagr)) {
      const cagrs = geographyCAGRs.get(geography) || []
      cagrs.push(record.cagr)
      geographyCAGRs.set(geography, cagrs)
    }
  })

  if (geographyCAGRs.size === 0) {
    console.warn('⚠️ getTopRegionsByCAGR: No valid CAGR data found')
    return []
  }

  // Calculate average CAGR for each geography
  const avgCAGRs = Array.from(geographyCAGRs.entries()).map(([geography, cagrs]) => ({
    geography,
    avgCAGR: cagrs.reduce((a, b) => a + b, 0) / cagrs.length
  }))

  // Sort geographies by average CAGR and get top N
  const sortedGeographies = avgCAGRs
    .sort((a, b) => b.avgCAGR - a.avgCAGR) // Sort by CAGR descending
    .slice(0, topN)
    .map(item => item.geography)

  console.log('📊 getTopRegionsByCAGR:', {
    topN,
    totalGeographies: geographyCAGRs.size,
    topRegions: sortedGeographies
  })

  return sortedGeographies
}

/**
 * Calculate top countries based on CAGR (Compound Annual Growth Rate)
 * @param data - The comparison data
 * @param topN - Number of top countries to return (default 5)
 * @returns Array of top country names sorted by CAGR
 */
export function getTopCountriesByCAGR(
  data: ComparisonData | null,
  topN: number = 5
): string[] {
  if (!data) {
    console.warn('⚠️ getTopCountriesByCAGR: No data provided')
    return []
  }

  if (!data.data || !data.data.value || !data.data.value.geography_segment_matrix) {
    console.error('❌ getTopCountriesByCAGR: Invalid data structure')
    return []
  }

  // Get all value data records
  const records = data.data.value.geography_segment_matrix

  if (!Array.isArray(records) || records.length === 0) {
    console.warn('⚠️ getTopCountriesByCAGR: No records found')
    return []
  }

  // Calculate average CAGR for each geography
  // Treat all geographies as single entities - aggregate by name
  const geographyCAGRs = new Map<string, number[]>()

  records.forEach((record: DataRecord) => {
    const geography = record.geography

    // Skip global level
    if (geography === 'Global') return

    // Treat all geographies as single entities - aggregate by name
    if (record.cagr !== undefined && record.cagr !== null && !isNaN(record.cagr)) {
      const cagrs = geographyCAGRs.get(geography) || []
      cagrs.push(record.cagr)
      geographyCAGRs.set(geography, cagrs)
    }
  })

  if (geographyCAGRs.size === 0) {
    console.warn('⚠️ getTopCountriesByCAGR: No valid CAGR data found')
    return []
  }

  // Calculate average CAGR for each geography
  const avgCAGRs = Array.from(geographyCAGRs.entries()).map(([geography, cagrs]) => ({
    geography,
    avgCAGR: cagrs.reduce((a, b) => a + b, 0) / cagrs.length
  }))

  // Sort geographies by average CAGR and get top N
  const sortedGeographies = avgCAGRs
    .sort((a, b) => b.avgCAGR - a.avgCAGR) // Sort by CAGR descending
    .slice(0, topN)
    .map(item => item.geography)

  console.log('📊 getTopCountriesByCAGR:', {
    topN,
    totalGeographies: geographyCAGRs.size,
    topCountries: sortedGeographies
  })

  return sortedGeographies
}

/**
 * Create dynamic filter configuration for Top Market preset
 * @param data - The comparison data
 * @returns Partial FilterState with dynamic values
 */
export function createTopMarketFilters(data: ComparisonData | null): Partial<FilterState> {
  if (!data) {
    return {
      viewMode: 'geography-mode',
      yearRange: [2024, 2028],
      dataType: 'value'
    }
  }

  const topRegions = getTopRegionsByMarketValue(data, 2024, 3)
  const firstSegmentType = getFirstSegmentType(data)
  const firstLevelSegments = firstSegmentType 
    ? getFirstLevelSegments(data, firstSegmentType)
    : []

  // Fallback: if no top regions found, use first available geography
  let geographies = topRegions
  if (geographies.length === 0 && data.dimensions?.geographies?.all_geographies) {
    const allGeos = data.dimensions.geographies.all_geographies.filter((g: string) => g !== 'Global')
    geographies = allGeos.slice(0, 3)
    console.log('⚠️ createTopMarketFilters: Using fallback geographies', geographies)
  }

  // Fallback: if no segments found, use first few segments from the segment type
  let segments = firstLevelSegments
  if (segments.length === 0 && firstSegmentType && data.dimensions?.segments?.[firstSegmentType]) {
    const allSegments = data.dimensions.segments[firstSegmentType].items || []
    segments = allSegments.slice(0, 3)
    console.log('⚠️ createTopMarketFilters: Using fallback segments', segments)
  }

  return {
    viewMode: 'geography-mode', // Geography on X-axis, segments as series
    geographies: geographies,
    segments: segments,
    segmentType: firstSegmentType || 'By Drug Class',
    yearRange: [2024, 2028],
    dataType: 'value'
  }
}

/**
 * Create dynamic filter configuration for Growth Leaders preset
 * Identifies top 2 regions with highest CAGR and uses first segment type with all first-level segments
 */
export function createGrowthLeadersFilters(data: ComparisonData | null): Partial<FilterState> {
  if (!data) {
    return {
      viewMode: 'geography-mode',
      yearRange: [2024, 2032],
      dataType: 'value'
    }
  }

  // Get top 2 regions with highest CAGR
  const topRegions = getTopRegionsByCAGR(data, 2)
  const firstSegmentType = getFirstSegmentType(data)
  const firstLevelSegments = firstSegmentType 
    ? getFirstLevelSegments(data, firstSegmentType)
    : []

  // Fallback: if no top regions found, use first available geography
  let geographies = topRegions
  if (geographies.length === 0 && data.dimensions?.geographies?.all_geographies) {
    const allGeos = data.dimensions.geographies.all_geographies.filter((g: string) => g !== 'Global')
    geographies = allGeos.slice(0, 2)
    console.log('⚠️ createGrowthLeadersFilters: Using fallback geographies', geographies)
  }

  // Fallback: if no segments found, use first few segments from the segment type
  let segments = firstLevelSegments
  if (segments.length === 0 && firstSegmentType && data.dimensions?.segments?.[firstSegmentType]) {
    const allSegments = data.dimensions.segments[firstSegmentType].items || []
    segments = allSegments.slice(0, 3)
    console.log('⚠️ createGrowthLeadersFilters: Using fallback segments', segments)
  }

  return {
    viewMode: 'geography-mode', // Geography on X-axis, segments as series
    geographies: geographies,
    segments: segments,
    segmentType: firstSegmentType || 'By Drug Class',
    yearRange: [2024, 2032],
    dataType: 'value'
  }
}

/**
 * Create dynamic filter configuration for Emerging Markets preset
 * Identifies top 5 countries with highest CAGR and uses first segment type with all first-level segments
 */
export function createEmergingMarketsFilters(data: ComparisonData | null): Partial<FilterState> {
  if (!data) {
    return {
      viewMode: 'geography-mode',
      yearRange: [2024, 2032],
      dataType: 'value'
    }
  }

  // Get top 5 countries with highest CAGR
  const topCountries = getTopCountriesByCAGR(data, 5)
  const firstSegmentType = getFirstSegmentType(data)
  const firstLevelSegments = firstSegmentType 
    ? getFirstLevelSegments(data, firstSegmentType)
    : []

  // Fallback: if no top countries found, use first available geography
  let geographies = topCountries
  if (geographies.length === 0 && data.dimensions?.geographies?.all_geographies) {
    const allGeos = data.dimensions.geographies.all_geographies.filter((g: string) => g !== 'Global')
    geographies = allGeos.slice(0, 5)
    console.log('⚠️ createEmergingMarketsFilters: Using fallback geographies', geographies)
  }

  // Fallback: if no segments found, use first few segments from the segment type
  let segments = firstLevelSegments
  if (segments.length === 0 && firstSegmentType && data.dimensions?.segments?.[firstSegmentType]) {
    const allSegments = data.dimensions.segments[firstSegmentType].items || []
    segments = allSegments.slice(0, 3)
    console.log('⚠️ createEmergingMarketsFilters: Using fallback segments', segments)
  }

  return {
    viewMode: 'geography-mode', // Geography on X-axis, segments as series
    geographies: geographies,
    segments: segments,
    segmentType: firstSegmentType || 'By Drug Class',
    yearRange: [2024, 2032],
    dataType: 'value'
  }
}
