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
    // For KPIs, if no geographies are selected, show totals for ALL geographies
    // If geographies are selected, show totals for those geographies only
    let selectedGeographies = filters.geographies.length > 0 
      ? filters.geographies // Use all selected geographies
      : [] // Empty array means we'll show data for all geographies (global total)
    
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
    
    // For KPI calculation, ALWAYS use leaf records to avoid double-counting
    // Filter by segment type and geography, but use ALL leaf records matching those filters
    let globalRecords = dataset.filter(record => {
      // Must match segment type
      if (targetSegmentType && record.segment_type !== targetSegmentType) {
        return false
      }
      // Filter by geography if selected
      if (selectedGeographies.length > 0 && !selectedGeographies.includes(record.geography)) {
        return false
      }
      // ONLY use leaf records (is_aggregated === false) to prevent double-counting
      if (record.is_aggregated !== false) {
        return false
      }
      return true
    })
    
    // If no leaf records found, try without geography filter
    if (globalRecords.length === 0 && selectedGeographies.length > 0) {
      globalRecords = dataset.filter(record => {
        if (targetSegmentType && record.segment_type !== targetSegmentType) {
          return false
        }
        if (record.is_aggregated !== false) {
          return false
        }
        return true
      })
      if (globalRecords.length > 0) {
        selectedGeographies = []
      }
    }
    
    // If still no records, try any segment type
    if (globalRecords.length === 0) {
      globalRecords = dataset.filter(record => {
        if (selectedGeographies.length > 0 && !selectedGeographies.includes(record.geography)) {
          return false
        }
        if (record.is_aggregated !== false) {
          return false
        }
        return true
      })
    }
    
    console.log('KPI Debug:', {
      totalDatasetRecords: dataset.length,
      leafRecordsFound: globalRecords.length,
      segmentType: targetSegmentType,
      selectedGeographies: selectedGeographies.length > 0 ? selectedGeographies : 'All',
      sampleRecord: globalRecords[0] ? {
        geography: globalRecords[0].geography,
        segment: globalRecords[0].segment,
        segmentType: globalRecords[0].segment_type,
        timeSeriesKeys: globalRecords[0].time_series ? Object.keys(globalRecords[0].time_series).map(k => parseInt(k)).filter(k => !isNaN(k)).sort((a, b) => a - b) : [],
        sampleValues: globalRecords[0].time_series ? {
          first: globalRecords[0].time_series[Object.keys(globalRecords[0].time_series).map(k => parseInt(k)).filter(k => !isNaN(k)).sort((a, b) => a - b)[0]],
          last: globalRecords[0].time_series[Object.keys(globalRecords[0].time_series).map(k => parseInt(k)).filter(k => !isNaN(k)).sort((a, b) => b - a)[0]],
          '2024': globalRecords[0].time_series[2024],
          '2032': globalRecords[0].time_series[2032]
        } : null
      } : null
    })

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
      
      // Always prefer leaf records for accuracy
      const leafRecords = allRecordsForSegmentType.filter(record => record.is_aggregated === false)
      if (leafRecords.length > 0) {
        globalRecords = leafRecords
        selectedGeographies = []
      } else {
        // Fall back to aggregated records - use level 1 if available
        const level1Aggregated = allRecordsForSegmentType.filter(record => 
          record.aggregation_level === 1 && record.is_aggregated === true
        )
        if (level1Aggregated.length > 0) {
          globalRecords = level1Aggregated
          selectedGeographies = []
        } else {
          // Use any aggregated records, grouping by geography
          const aggregatedRecords = allRecordsForSegmentType.filter(r => r.is_aggregated === true)
          if (aggregatedRecords.length > 0) {
            const geographyMap = new Map<string, DataRecord>()
            aggregatedRecords.forEach(record => {
              const key = record.geography
              if (geographyMap.has(key)) {
                const existing = geographyMap.get(key)!
                existing.time_series[2024] = (existing.time_series[2024] || 0) + (record.time_series[2024] || 0)
                existing.time_series[2032] = (existing.time_series[2032] || 0) + (record.time_series[2032] || 0)
              } else {
                geographyMap.set(key, { ...record })
              }
            })
            globalRecords = Array.from(geographyMap.values())
            selectedGeographies = []
          }
        }
      }
    }

    // If still no records, try with just the segment type and any geography
    if (globalRecords.length === 0 && targetSegmentType) {
      const allRecordsForSegmentType = dataset.filter(record => {
        return record.segment_type === targetSegmentType
      })
      
      // Always prefer leaf records
      const leafRecords = allRecordsForSegmentType.filter(record => record.is_aggregated === false)
      if (leafRecords.length > 0) {
        globalRecords = leafRecords
        selectedGeographies = []
      } else {
        // Fall back to level 1 aggregated records
        const level1Aggregated = allRecordsForSegmentType.filter(record => 
          record.aggregation_level === 1 && record.is_aggregated === true
        )
        if (level1Aggregated.length > 0) {
          globalRecords = level1Aggregated
          selectedGeographies = []
        } else {
          // Use any aggregated records
          const aggregatedRecords = allRecordsForSegmentType.filter(r => r.is_aggregated === true)
          if (aggregatedRecords.length > 0) {
            const geographyMap = new Map<string, DataRecord>()
            aggregatedRecords.forEach(record => {
              const key = record.geography
              if (geographyMap.has(key)) {
                const existing = geographyMap.get(key)!
                existing.time_series[2024] = (existing.time_series[2024] || 0) + (record.time_series[2024] || 0)
                existing.time_series[2032] = (existing.time_series[2032] || 0) + (record.time_series[2032] || 0)
              } else {
                geographyMap.set(key, { ...record })
              }
            })
            globalRecords = Array.from(geographyMap.values())
            selectedGeographies = []
          }
        }
      }
    }

    // If still no records, return null (no data available for this segment type)
    if (globalRecords.length === 0) {
      console.warn('No KPI data available for segment type:', targetSegmentType, 'with geographies:', selectedGeographies)
      return null
    }

    // Get available years from metadata or from first record
    const availableYears = data.metadata.years || []
    const startYear = data.metadata.start_year || availableYears[0] || 2024
    const endYear = data.metadata.forecast_year || availableYears[availableYears.length - 1] || 2032
    
    // Use actual years from data, but also try 2024/2032
    const kpiStartYear = startYear
    const kpiEndYear = endYear

    // Calculate total market size - sum ALL leaf records
    let marketSize2024 = 0
    let marketSize2032 = 0

    globalRecords.forEach(record => {
      const timeSeries = record.time_series || {}
      
      // Try multiple year options
      let valueStart = timeSeries[kpiStartYear] ?? timeSeries[2024] ?? 0
      let valueEnd = timeSeries[kpiEndYear] ?? timeSeries[2032] ?? 0
      
      // If still zero, get first and last available years
      if (valueStart === 0 || valueEnd === 0) {
        const years = Object.keys(timeSeries).map(k => parseInt(k)).filter(k => !isNaN(k) && timeSeries[k] > 0).sort((a, b) => a - b)
        if (years.length > 0) {
          if (valueStart === 0) valueStart = timeSeries[years[0]] ?? 0
          if (valueEnd === 0) valueEnd = timeSeries[years[years.length - 1]] ?? 0
        }
      }
      
      // Ensure values are numbers
      const num2024 = typeof valueStart === 'number' ? valueStart : parseFloat(String(valueStart)) || 0
      const num2032 = typeof valueEnd === 'number' ? valueEnd : parseFloat(String(valueEnd)) || 0
      
      marketSize2024 += num2024
      marketSize2032 += num2032
    })
    
    console.log('KPI Calculation Result:', {
      recordsUsed: globalRecords.length,
      marketSize2024,
      marketSize2032,
      startYear: kpiStartYear,
      endYear: kpiEndYear,
      availableYears: availableYears.slice(0, 5)
    })

    // Calculate CAGR from start year to end year
    const years = kpiEndYear - kpiStartYear
    const cagr = marketSize2024 > 0 && years > 0
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
    
    // Get unit label
    const unit = filters.dataType === 'value'
      ? (data.metadata.value_unit || 'Million')
      : (data.metadata.volume_unit || 'Units')
    
    // Use raw values directly - no conversion
    const marketSize2024Display = marketSize2024
    const marketSize2032Display = marketSize2032
    const absoluteGrowthDisplay = absoluteGrowth

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
      unit: unit || '',
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
