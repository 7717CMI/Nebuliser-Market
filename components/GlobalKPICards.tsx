'use client'

import { useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { TrendingUp, DollarSign, Calendar, Activity } from 'lucide-react'
import { formatIndianNumber, formatIndianNumberWithCommas, formatCurrencyValue } from '@/lib/utils'
import type { DataRecord } from '@/lib/types'

export function GlobalKPICards() {
  const { data, filters, currency } = useDashboardStore()

  const kpiData = useMemo(() => {
    if (!data) return null

    // Use current filters to determine what to show
    // Get target geography from filters - use all selected geographies or use all geographies
    const allGeographies = data.dimensions.geographies.all_geographies || []
    // If no geographies are selected, we'll use all geographies (empty array means no filter)
    let selectedGeographies = filters.geographies.length > 0 
      ? filters.geographies // Use all selected geographies
      : [] // Empty array means we'll show data for all geographies
    
    // Get segment type from filters (or use first segment type)
    const segmentTypes = Object.keys(data.dimensions.segments)
    const targetSegmentType = filters.segmentType || segmentTypes[0] || null
    
    // If no segment type is set, can't calculate KPIs
    if (!targetSegmentType) {
      return null
    }
    
    // Get the appropriate dataset based on data type filter
    const dataset = filters.dataType === 'value'
      ? data.data.value.geography_segment_matrix
      : data.data.volume.geography_segment_matrix
    
    // Filter records based on selected geographies and segment type
    // Use aggregation data when available based on aggregationLevel filter
    let globalRecords = dataset.filter(record => {
      // Filter by geography - include records from any selected geography
      if (selectedGeographies.length > 0 && !selectedGeographies.includes(record.geography)) {
        return false
      }
      // Filter by segment type (CRITICAL: prevents double-counting across segment types)
      if (targetSegmentType && record.segment_type !== targetSegmentType) {
        return false
      }
      return true
    })
    
    // Use aggregation data based on aggregationLevel filter
    if (filters.aggregationLevel !== null && filters.aggregationLevel !== undefined) {
      // When aggregationLevel is set, use records at that level
      // Prefer aggregated records at that level, but also include leaf records at that level
      globalRecords = globalRecords.filter(record => 
        record.aggregation_level === filters.aggregationLevel
      )
      
      // If we have aggregated records at this level, prefer them over leaf records
      const aggregatedAtLevel = globalRecords.filter(r => r.is_aggregated === true)
      if (aggregatedAtLevel.length > 0) {
        // Use aggregated records, but also include leaf records that don't have a corresponding aggregated record
        const aggregatedSegments = new Set(aggregatedAtLevel.map(r => `${r.geography}::${r.segment}`))
        globalRecords = globalRecords.filter(record => 
          record.is_aggregated === true || 
          !aggregatedSegments.has(`${record.geography}::${record.segment}`)
        )
      }
    } else {
      // When aggregationLevel is null (showing "All Levels"), use highest level aggregated records
      // First, try to find level 1 aggregated records (total aggregation per geography)
      const level1Aggregated = globalRecords.filter(record => 
        record.aggregation_level === 1 && record.is_aggregated === true
      )
      
      if (level1Aggregated.length > 0) {
        // Use level 1 aggregated records
        globalRecords = level1Aggregated
      } else {
        // Fall back to aggregating leaf records manually
        // Group by geography and sum values
        const geographyTotals = new Map<string, { record: DataRecord, total2024: number, total2032: number }>()
        
        const leafRecords = globalRecords.filter(record => record.is_aggregated === false)
        leafRecords.forEach(record => {
          const key = record.geography
          if (!geographyTotals.has(key)) {
            geographyTotals.set(key, {
              record: { ...record },
              total2024: 0,
              total2032: 0
            })
          }
          const totals = geographyTotals.get(key)!
          totals.total2024 += record.time_series[2024] || 0
          totals.total2032 += record.time_series[2032] || 0
        })
        
        // Create aggregated records from totals
        globalRecords = Array.from(geographyTotals.values()).map(({ record, total2024, total2032 }) => ({
          ...record,
          time_series: {
            ...record.time_series,
            2024: total2024,
            2032: total2032
          },
          is_aggregated: true,
          aggregation_level: 1
        }))
      }
    }

    // If no records match the current filters, try a fallback approach
    // First, try without geography filter if geographies were selected
    if (globalRecords.length === 0 && selectedGeographies.length > 0) {
      // Try with all geographies for this segment type
      const allRecordsForSegmentType = dataset.filter(record => {
        if (targetSegmentType && record.segment_type !== targetSegmentType) {
          return false
        }
        return true
      })
      
      // Use same aggregation logic for fallback
      if (filters.aggregationLevel !== null && filters.aggregationLevel !== undefined) {
        const recordsAtLevel = allRecordsForSegmentType.filter(record => 
          record.aggregation_level === filters.aggregationLevel
        )
        const aggregatedAtLevel = recordsAtLevel.filter(r => r.is_aggregated === true)
        if (aggregatedAtLevel.length > 0) {
          const aggregatedSegments = new Set(aggregatedAtLevel.map(r => `${r.geography}::${r.segment}`))
          globalRecords = recordsAtLevel.filter(record => 
            record.is_aggregated === true || 
            !aggregatedSegments.has(`${record.geography}::${record.segment}`)
          )
        } else {
          globalRecords = recordsAtLevel
        }
      } else {
        // Try level 1 aggregated records
        const level1Aggregated = allRecordsForSegmentType.filter(record => 
          record.aggregation_level === 1 && record.is_aggregated === true
        )
        if (level1Aggregated.length > 0) {
          globalRecords = level1Aggregated
        } else {
          // Fall back to leaf records
          const leafRecords = allRecordsForSegmentType.filter(record => 
            record.is_aggregated === false
          )
          if (leafRecords.length > 0) {
            globalRecords = leafRecords
          }
        }
      }
      
      if (globalRecords.length > 0) {
        // Update selected geographies to reflect that we're showing all geographies
        selectedGeographies = []
      }
    }

    // If still no records, try with just the segment type and any geography
    if (globalRecords.length === 0 && targetSegmentType) {
      const allRecordsForSegmentType = dataset.filter(record => {
        return record.segment_type === targetSegmentType
      })
      
      // Use same aggregation logic for fallback
      if (filters.aggregationLevel !== null && filters.aggregationLevel !== undefined) {
        const recordsAtLevel = allRecordsForSegmentType.filter(record => 
          record.aggregation_level === filters.aggregationLevel
        )
        const aggregatedAtLevel = recordsAtLevel.filter(r => r.is_aggregated === true)
        if (aggregatedAtLevel.length > 0) {
          const aggregatedSegments = new Set(aggregatedAtLevel.map(r => `${r.geography}::${r.segment}`))
          globalRecords = recordsAtLevel.filter(record => 
            record.is_aggregated === true || 
            !aggregatedSegments.has(`${record.geography}::${record.segment}`)
          )
        } else {
          globalRecords = recordsAtLevel
        }
      } else {
        // Try level 1 aggregated records
        const level1Aggregated = allRecordsForSegmentType.filter(record => 
          record.aggregation_level === 1 && record.is_aggregated === true
        )
        if (level1Aggregated.length > 0) {
          globalRecords = level1Aggregated
        } else {
          // Fall back to leaf records
          const leafRecords = allRecordsForSegmentType.filter(record => 
            record.is_aggregated === false
          )
          if (leafRecords.length > 0) {
            globalRecords = leafRecords
          }
        }
      }
      
      if (globalRecords.length > 0) {
        selectedGeographies = []
      }
    }

    // If still no records, return null (no data available for this segment type)
    if (globalRecords.length === 0) {
      console.warn('No KPI data available for segment type:', targetSegmentType, 'with geographies:', selectedGeographies)
      return null
    }

    // Calculate total market size for 2024 and 2032
    let marketSize2024 = 0
    let marketSize2032 = 0

    globalRecords.forEach(record => {
      marketSize2024 += record.time_series[2024] || 0
      marketSize2032 += record.time_series[2032] || 0
    })

    // Calculate CAGR from 2024 to 2032
    const years = 2032 - 2024
    const cagr = marketSize2024 > 0 
      ? (Math.pow(marketSize2032 / marketSize2024, 1 / years) - 1) * 100
      : 0

    // Calculate absolute growth
    const absoluteGrowth = marketSize2032 - marketSize2024
    const growthPercentage = marketSize2024 > 0 
      ? ((marketSize2032 - marketSize2024) / marketSize2024) * 100
      : 0

    // Get currency preference
    const selectedCurrency = currency || data.metadata.currency || 'USD'
    const isINR = selectedCurrency === 'INR'
    
    // Values in time_series are in base units (not millions)
    // For INR, we don't use "Million", we use Indian number system (Lakhs, Crores)
    // For USD, we convert to millions
    const unit = filters.dataType === 'value'
      ? (data.metadata.value_unit || 'Million')
      : (data.metadata.volume_unit || 'Units')
    const needsConversion = unit.toLowerCase().includes('million') && !isINR
    
    // Convert to display units
    const marketSize2024Display = needsConversion 
      ? marketSize2024 / 1000000
      : marketSize2024
    const marketSize2032Display = needsConversion 
      ? marketSize2032 / 1000000
      : marketSize2032
    const absoluteGrowthDisplay = needsConversion 
      ? absoluteGrowth / 1000000
      : absoluteGrowth

    // Build descriptive labels
    // Note: selectedGeographies might be empty if we fell back to showing all geographies
    const actualSelectedGeographies = filters.geographies.length > 0 ? filters.geographies : []
    const dataTypeLabel = filters.dataType === 'value' ? 'Market Size' : 'Market Volume'
    const geographyLabel = actualSelectedGeographies.length === 0 
      ? 'All Geographies'
      : actualSelectedGeographies.length === 1
      ? actualSelectedGeographies[0]
      : `${actualSelectedGeographies.length} Geographies (${actualSelectedGeographies.slice(0, 2).join(', ')}${actualSelectedGeographies.length > 2 ? '...' : ''})`
    const segmentTypeLabel = targetSegmentType || 'All Segments'

    return {
      marketSize2024: marketSize2024Display,
      marketSize2032: marketSize2032Display,
      cagr,
      absoluteGrowth: absoluteGrowthDisplay,
      growthPercentage,
      currency: selectedCurrency,
      unit: isINR ? '' : (unit || 'Million'),
      dataTypeLabel,
      geographyLabel,
      segmentTypeLabel,
      dataType: filters.dataType,
      isINR
    }
  }, [data, filters, currency])

  if (!kpiData) return null

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-y border-gray-200">
      <div className="container mx-auto px-6 py-3">
        {/* Descriptive Header */}
        <div className="mb-3 pb-2 border-b border-gray-300">
          <p className="text-xs text-gray-700">
            <span className="font-semibold">{kpiData.dataTypeLabel}</span>
            {' for '}
            <span className="font-semibold">{kpiData.geographyLabel}</span>
            {kpiData.segmentTypeLabel && (
              <>
                {' | '}
                <span className="font-semibold">{kpiData.segmentTypeLabel}</span>
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {/* Market Size 2024 */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded">
              {kpiData.currency === 'INR' ? (
                <span className="text-blue-600 font-bold text-lg">₹</span>
              ) : (
                <DollarSign className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div>
              <p className="text-[10px] text-black uppercase tracking-wider font-semibold">
                {kpiData.dataTypeLabel} 2024
              </p>
              <p className="text-base font-bold text-black leading-tight">
                {kpiData.dataType === 'value' && kpiData.isINR 
                  ? `₹ ${formatIndianNumber(kpiData.marketSize2024)}`
                  : kpiData.dataType === 'value'
                  ? `$ ${kpiData.marketSize2024.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${kpiData.unit}`
                  : `${kpiData.marketSize2024.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${kpiData.unit}`}
              </p>
            </div>
          </div>

          {/* Market Size 2032 */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded">
              <Calendar className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-black uppercase tracking-wider font-semibold">
                {kpiData.dataTypeLabel} 2032
              </p>
              <p className="text-base font-bold text-black leading-tight">
                {kpiData.dataType === 'value' && kpiData.isINR 
                  ? `₹ ${formatIndianNumber(kpiData.marketSize2032)}`
                  : kpiData.dataType === 'value'
                  ? `$ ${kpiData.marketSize2032.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${kpiData.unit}`
                  : `${kpiData.marketSize2032.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${kpiData.unit}`}
              </p>
            </div>
          </div>

          {/* CAGR */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] text-black uppercase tracking-wider font-semibold">
                CAGR (2024-2032)
              </p>
              <p className="text-base font-bold text-black leading-tight">
                {kpiData.cagr.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Absolute Growth */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-100 rounded">
              <Activity className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] text-black uppercase tracking-wider font-semibold">
                Absolute Growth (2024-2032)
              </p>
              <p className="text-base font-bold text-black leading-tight">
                {kpiData.dataType === 'value' && kpiData.isINR 
                  ? `₹ ${formatIndianNumber(kpiData.absoluteGrowth)}`
                  : kpiData.dataType === 'value'
                  ? `$ ${kpiData.absoluteGrowth.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${kpiData.unit}`
                  : `${kpiData.absoluteGrowth.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${kpiData.unit}`}
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                +{kpiData.growthPercentage.toFixed(1)}% increase
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
