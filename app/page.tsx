'use client'

import { useEffect, useState, useRef } from 'react'
import { useDashboardStore } from '@/lib/store'
import { createMockData } from '@/lib/mock-data'
import { FilterPanel } from '@/components/filters/FilterPanel'
import { EnhancedFilterPanel } from '@/components/filters/EnhancedFilterPanel'
import { GroupedBarChart } from '@/components/charts/GroupedBarChart'
import { MultiLineChart } from '@/components/charts/MultiLineChart'
import { MatrixHeatmap } from '@/components/charts/MatrixHeatmap'
import { ComparisonTable } from '@/components/charts/ComparisonTable'
import { WaterfallChart } from '@/components/charts/WaterfallChart'
import { D3BubbleChartIndependent } from '@/components/charts/D3BubbleChartIndependent'
import { CompetitiveIntelligence } from '@/components/charts/CompetitiveIntelligence'
import CustomerIntelligenceHeatmap from '@/components/charts/CustomerIntelligenceHeatmap'
import DistributorsIntelligence from '@/components/charts/DistributorsIntelligenceTable'
import DistributorsIntelligenceHeatmap from '@/components/charts/DistributorsIntelligenceHeatmap'
import { RawDataTable } from '@/components/charts/RawDataTable'
import { InsightsPanel } from '@/components/InsightsPanel'
import { FilterPresets } from '@/components/filters/FilterPresets'
import { ChartGroupSelector } from '@/components/filters/ChartGroupSelector'
import { CustomScrollbar } from '@/components/ui/CustomScrollbar'
import { GlobalKPICards } from '@/components/GlobalKPICards'
import { getChartsForGroup } from '@/lib/chart-groups'
import { Lightbulb, X, Layers, LayoutGrid } from 'lucide-react'
import { Footer } from '@/components/Footer'
import Image from 'next/image'

export default function DashboardPage() {
  const { 
    setData, 
    setLoading, 
    setError, 
    data, 
    isLoading, 
    error, 
    filters, 
    selectedChartGroup,
    intelligenceType,
    customerIntelligenceData,
    distributorIntelligenceData,
    rawIntelligenceData,
    proposition2Data,
    proposition3Data,
    dashboardName
  } = useDashboardStore()
  
  const [mounted, setMounted] = useState(false)
  const [activePropositionTab, setActivePropositionTab] = useState<'prop1' | 'prop2' | 'prop3'>('prop1')
  
  // Debug: Log store values when they change
  useEffect(() => {
    console.log('📊 Dashboard Store Values:', {
      intelligenceType,
      rawIntelligenceData: rawIntelligenceData ? `${rawIntelligenceData.rows?.length || 0} rows, ${rawIntelligenceData.headers?.length || 0} columns` : 'null',
      selectedChartGroup
    })
  }, [intelligenceType, rawIntelligenceData, selectedChartGroup])

  // Set default proposition tab when data loads
  useEffect(() => {
    const hasProp1 = rawIntelligenceData && rawIntelligenceData.rows && rawIntelligenceData.rows.length > 0
    const hasProp2 = proposition2Data && proposition2Data.rows && proposition2Data.rows.length > 0
    const hasProp3 = proposition3Data && proposition3Data.rows && proposition3Data.rows.length > 0
    
    if (hasProp1 && activePropositionTab !== 'prop1' && !hasProp2 && !hasProp3) {
      setActivePropositionTab('prop1')
    } else if (hasProp2 && activePropositionTab !== 'prop2' && !hasProp1 && !hasProp3) {
      setActivePropositionTab('prop2')
    } else if (hasProp3 && activePropositionTab !== 'prop3' && !hasProp1 && !hasProp2) {
      setActivePropositionTab('prop3')
    } else if (hasProp1 && activePropositionTab !== 'prop1' && activePropositionTab !== 'prop2' && activePropositionTab !== 'prop3') {
      setActivePropositionTab('prop1')
    }
  }, [rawIntelligenceData, proposition2Data, proposition3Data, activePropositionTab])
  const [activeTab, setActiveTab] = useState<'bar' | 'line' | 'heatmap' | 'table' | 'waterfall' | 'bubble' | 'competitive-intelligence' | 'customer-intelligence'>('bar')
  const [showInsights, setShowInsights] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'tabs' | 'vertical'>('tabs')
  const sidebarScrollRef = useRef<HTMLDivElement>(null)

  // Check what data is available
  const hasMarketData = !!data
  const hasIntelligenceData = !!(rawIntelligenceData || customerIntelligenceData || distributorIntelligenceData)

  // Get visible charts based on selected chart group
  const visibleCharts = getChartsForGroup(selectedChartGroup)
  
  // Helper function to check if a chart should be visible
  const isChartVisible = (chartId: string): boolean => {
    // For customer-intelligence, only show if data exists
    if (chartId === 'customer-intelligence') {
      return visibleCharts.includes(chartId) && hasIntelligenceData
    }
    // For market charts, only show if market data exists
    if (['grouped-bar', 'multi-line', 'heatmap', 'comparison-table', 'waterfall', 'bubble', 'competitive-intelligence'].includes(chartId)) {
      return visibleCharts.includes(chartId) && hasMarketData
    }
    return visibleCharts.includes(chartId)
  }

  // Map chart IDs to tab values
  const chartIdToTab: Record<string, typeof activeTab> = {
    'grouped-bar': 'bar',
    'multi-line': 'line',
    'heatmap': 'heatmap',
    'comparison-table': 'table',
    'waterfall': 'waterfall',
    'bubble': 'bubble',
    'competitive-intelligence': 'competitive-intelligence',
    'customer-intelligence': 'customer-intelligence'
  }

  // Auto-switch chart group based on available data
  useEffect(() => {
    // If customer-intelligence is selected but no data exists, switch to available group
    if (selectedChartGroup === 'customer-intelligence' && !hasIntelligenceData) {
      const { setSelectedChartGroup } = useDashboardStore.getState()
      if (hasMarketData) {
        console.log('No intelligence data, switching from customer-intelligence group to market-analysis')
        setSelectedChartGroup('market-analysis')
      }
    }
    // If only intelligence data exists, switch to customer-intelligence group
    else if (!hasMarketData && hasIntelligenceData && selectedChartGroup !== 'customer-intelligence') {
      const { setSelectedChartGroup } = useDashboardStore.getState()
      console.log('Only intelligence data exists, switching to customer-intelligence group')
      setSelectedChartGroup('customer-intelligence')
    }
    // If only market data exists, ensure we're on a market group
    else if (hasMarketData && !hasIntelligenceData && selectedChartGroup === 'customer-intelligence') {
      const { setSelectedChartGroup } = useDashboardStore.getState()
      console.log('Only market data exists, switching from customer-intelligence to market-analysis')
      setSelectedChartGroup('market-analysis')
    }
  }, [selectedChartGroup, hasIntelligenceData, hasMarketData])

  // Auto-switch to first available tab when chart group changes
  useEffect(() => {
    // Only switch if the current tab is not valid for the current chart group
    const currentChartId = Object.entries(chartIdToTab).find(([_, tab]) => tab === activeTab)?.[0]
    const isCurrentTabValid = currentChartId && isChartVisible(currentChartId)
    
    // If current tab is valid, don't switch
    if (isCurrentTabValid) {
      return
    }
    
    // If currently on customer-intelligence tab but no data exists, switch to first available
    if (activeTab === 'customer-intelligence' && !hasIntelligenceData) {
      const firstVisibleChart = visibleCharts.find(chart => chart !== 'customer-intelligence' && isChartVisible(chart))
      if (firstVisibleChart && chartIdToTab[firstVisibleChart]) {
        const targetTab = chartIdToTab[firstVisibleChart]
        console.log('No intelligence data, switching from customer-intelligence tab to:', targetTab)
        setActiveTab(targetTab)
        return
      }
    }
    
    // If only intelligence data exists, switch to customer-intelligence tab
    if (!hasMarketData && hasIntelligenceData && activeTab !== 'customer-intelligence') {
      if (isChartVisible('customer-intelligence')) {
        console.log('Only intelligence data exists, switching to customer-intelligence tab')
        setActiveTab('customer-intelligence')
        return
      }
    }
    
    // If only market data exists and we're on customer-intelligence, switch to first market tab
    if (hasMarketData && !hasIntelligenceData && activeTab === 'customer-intelligence') {
      const firstMarketChart = visibleCharts.find(chart => chart !== 'customer-intelligence' && isChartVisible(chart))
      if (firstMarketChart && chartIdToTab[firstMarketChart]) {
        const targetTab = chartIdToTab[firstMarketChart]
        console.log('Only market data exists, switching from customer-intelligence to:', targetTab)
        setActiveTab(targetTab)
        return
      }
    }
    
    // Find first visible chart for the current group
    const firstVisibleChart = visibleCharts.find(chart => isChartVisible(chart))
    if (firstVisibleChart && chartIdToTab[firstVisibleChart]) {
      const targetTab = chartIdToTab[firstVisibleChart]
      // Only switch if we're not already on this tab
      if (activeTab !== targetTab) {
        console.log('Switching to tab:', targetTab, 'for chart group:', selectedChartGroup)
        setActiveTab(targetTab)
      }
    } else {
      console.warn('No visible chart found for group:', selectedChartGroup, 'visibleCharts:', visibleCharts)
    }
  }, [selectedChartGroup, visibleCharts, hasIntelligenceData, hasMarketData])

  // Auto-switch to heatmap when matrix mode is selected
  useEffect(() => {
    if (filters.viewMode === 'matrix' && isChartVisible('heatmap')) {
      setActiveTab('heatmap')
    }
  }, [filters.viewMode])

  useEffect(() => {
    setMounted(true)
    
    // Check if data already exists in store (e.g., from Excel upload)
    // Only auto-load if no data exists (fresh page load)
    const currentData = useDashboardStore.getState().data
    if (currentData) {
      console.log('Data already exists in store, skipping auto-load')
      setLoading(false)
      return
    }
    
    // If we're coming from an upload, don't auto-load old data
    // The upload page will handle setting the new data
    
    // Load data from API only if no data exists
    async function loadData() {
      try {
        setLoading(true)
        
        // Fetch data from API with default paths
        const response = await fetch('/api/process-data?valuePath=data/value.json&volumePath=data/volume.json&segmentationPath=data/segmentation_analysis.json')
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || errorData.details || `Failed to load data: ${response.statusText}`
          const debugInfo = errorData.debug ? `\nDebug: ${JSON.stringify(errorData.debug, null, 2)}` : ''
          throw new Error(`${errorMessage}${debugInfo}`)
        }
        
        const data = await response.json()
        setData(data) // This will automatically set default filters via store
        
        // Explicitly load default filters (redundant but ensures it happens)
        const { loadDefaultFilters } = useDashboardStore.getState()
        loadDefaultFilters()
      } catch (err) {
        console.error('Error loading data:', err)
        const errorMessage = err instanceof Error ? err.message : 'An error occurred'
        console.error('Full error details:', {
          message: errorMessage,
          error: err
        })
        // Fallback to mock data if API fails
        console.warn('Falling back to mock data')
        const mockData = createMockData()
        setData(mockData)
        setError(`${errorMessage}. Using mock data.`)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [setData, setLoading, setError])

  if (!mounted) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-black">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-2xl font-semibold mb-3">⚠️ Error</div>
          <p className="text-black mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-black">No data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Demo Data Watermark */}
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div 
          className="text-6xl font-bold opacity-20 select-none"
          style={{
            color: '#fef3c7',
            transform: 'rotate(-45deg)',
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            letterSpacing: '0.1em'
          }}
        >
          DEMO DATA
        </div>
      </div>
      {/* Main Content */}
      <div className="container mx-auto px-6 py-6 flex-1">
        {/* Header with Logo */}
        <div className="mb-6 flex items-center justify-between gap-4">
          {/* Logo on the left */}
          <div className="flex-shrink-0">
            <Image 
              src="/logo.png" 
              alt="Coherent Market Insights Logo" 
              width={150} 
              height={60}
              className="h-auto w-auto max-w-[150px]"
              priority
            />
          </div>
          
          {/* Centered Title and Subtitle */}
          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-black mb-1">
                Coherent Dashboard
              </h1>
              <h2 className="text-base font-semibold text-black">
                {dashboardName || 'U.S. and Europe Nebulizer Market Analysis'}
              </h2>
            </div>
          </div>
        </div>

        {/* Render dashboard based on available data */}
        {(() => {
          // If no data at all, show message
          if (!hasMarketData && !hasIntelligenceData) {
            return (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md">
                  <p className="text-gray-600 text-lg mb-4">No data available</p>
                  <p className="text-sm text-gray-500 mb-6">Please upload data using the Dashboard Builder</p>
                  
                </div>
              </div>
            )
          }
          
          return (
            <>
              {/* Global KPI Cards - Only show if market data exists */}
              {hasMarketData && (
                <div className="mb-6">
                  <GlobalKPICards />
                </div>
              )}
              
              <div className="grid grid-cols-12 gap-6">
                {/* Sidebar - Enhanced Filter Panel - Only show if market data exists */}
                {hasMarketData && (
                  <aside className={`transition-all duration-300 ${
                    sidebarCollapsed 
                      ? 'col-span-12 lg:col-span-1' 
                      : 'col-span-12 lg:col-span-3'
                  }`}>
                    {sidebarCollapsed ? (
                      <div className="sticky top-6">
                        <div className="bg-white rounded-lg shadow-sm p-2 space-y-4">
                          <button
                            onClick={() => {
                              setShowInsights(false)
                              setSidebarCollapsed(false)
                            }}
                            className="w-full flex flex-col items-center gap-1 py-2 hover:bg-gray-50 rounded"
                            title="Expand Filters"
                          >
                            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                            <span className="text-xs text-black">Filters</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="sticky top-6 self-start">
                        <div className="max-h-[calc(100vh-6rem)] relative">
                          <CustomScrollbar containerRef={sidebarScrollRef}>
                            <div ref={sidebarScrollRef} className="overflow-y-auto pr-6 space-y-3 sidebar-scroll max-h-[calc(100vh-6rem)]">
                              <ChartGroupSelector />
                              <FilterPresets />
                              <EnhancedFilterPanel />
                            </div>
                          </CustomScrollbar>
                        </div>
                      </div>
                    )}
                  </aside>
                )}

                {/* Main Content Area */}
                <main className={`transition-all duration-300 ${
                  hasMarketData
                    ? sidebarCollapsed 
                      ? showInsights 
                        ? 'col-span-12 lg:col-span-8'
                        : 'col-span-12 lg:col-span-11'
                      : showInsights
                        ? 'col-span-12 lg:col-span-6'
                        : 'col-span-12 lg:col-span-9'
                    : 'col-span-12'
                } space-y-6`}>

                  {/* Tab Navigation - Only show if there's data */}
                  {(hasMarketData || hasIntelligenceData) && (
                    <div className="bg-white rounded-lg shadow">
                      <div className="border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <nav className="flex items-center -mb-px">
                            {/* View Mode Toggle - Only show for market data */}
                            {hasMarketData && (
                              <div className="flex gap-1 mr-4 ml-4 py-2">
                                <button
                                  onClick={() => setViewMode('tabs')}
                                  className={`p-1.5 rounded ${
                                    viewMode === 'tabs' 
                                      ? 'bg-blue-100 text-blue-600' 
                                      : 'text-black hover:text-black'
                                  }`}
                                  title="Tab View"
                                >
                                  <Layers className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setViewMode('vertical')}
                                  className={`p-1.5 rounded ${
                                    viewMode === 'vertical' 
                                      ? 'bg-blue-100 text-blue-600' 
                                      : 'text-black hover:text-black'
                                  }`}
                                  title="Vertical View (All Charts)"
                                >
                                  <LayoutGrid className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                            
                            {/* Tab Buttons - Only show in tabs mode for market data, or always for intelligence only */}
                            {(viewMode === 'tabs' || !hasMarketData) && (
                              <>
                                {hasMarketData && isChartVisible('grouped-bar') && (
                                  <button
                                    onClick={() => setActiveTab('bar')}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                      activeTab === 'bar'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-black hover:text-black hover:border-gray-300'
                                    }`}
                                  >
                                    📊 Grouped Bar Chart
                                  </button>
                                )}
                                {hasMarketData && isChartVisible('multi-line') && (
                                  <button
                                    onClick={() => setActiveTab('line')}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                      activeTab === 'line'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-black hover:text-black hover:border-gray-300'
                                    }`}
                                  >
                                    📈 Line Chart
                                  </button>
                                )}
                                {hasMarketData && isChartVisible('heatmap') && (
                                  <button
                                    onClick={() => setActiveTab('heatmap')}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                      activeTab === 'heatmap'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-black hover:text-black hover:border-gray-300'
                                    }`}
                                  >
                                    🔥 Heatmap
                                  </button>
                                )}
                                {hasMarketData && isChartVisible('comparison-table') && (
                                  <button
                                    onClick={() => setActiveTab('table')}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                      activeTab === 'table'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-black hover:text-black hover:border-gray-300'
                                    }`}
                                  >
                                    📋 Table
                                  </button>
                                )}
                                {hasMarketData && isChartVisible('waterfall') && (
                                  <button
                                    onClick={() => setActiveTab('waterfall')}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                      activeTab === 'waterfall'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-black hover:text-black hover:border-gray-300'
                                    }`}
                                  >
                                    💧 Waterfall
                                  </button>
                                )}
                                {hasMarketData && isChartVisible('bubble') && (
                                  <button
                                    onClick={() => setActiveTab('bubble')}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                      activeTab === 'bubble'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-black hover:text-black hover:border-gray-300'
                                    }`}
                                  >
                                    🫧 Bubble Chart
                                  </button>
                                )}
                                {hasMarketData && isChartVisible('competitive-intelligence') && (
                                  <button
                                    onClick={() => setActiveTab('competitive-intelligence')}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                      activeTab === 'competitive-intelligence'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-black hover:text-black hover:border-gray-300'
                                    }`}
                                  >
                                    🏆 Competitive Intelligence
                                  </button>
                                )}
                                {hasIntelligenceData && isChartVisible('customer-intelligence') && (
                                  <button
                                    onClick={() => setActiveTab('customer-intelligence')}
                                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                      activeTab === 'customer-intelligence'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-black hover:text-black hover:border-gray-300'
                                    }`}
                                  >
                                    {intelligenceType === 'customer' ? '👥 Customer Intelligence' : intelligenceType === 'distributor' ? '📦 Distributor Intelligence' : '👥 Customer Intelligence'}
                                  </button>
                                )}
                              </>
                            )}
                          </nav>
                          
                          {/* Insights Button - Only show if market data exists */}
                          {hasMarketData && (
                            <div className="flex gap-2 px-4">
                              <button
                                onClick={() => {
                                  setShowInsights(!showInsights)
                                  setSidebarCollapsed(!showInsights)
                                }}
                                className={`flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors ${
                                  showInsights 
                                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                                    : 'text-black hover:text-black hover:bg-gray-100'
                                }`}
                              >
                                <Lightbulb className="h-4 w-4" />
                                Insights
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

          {/* Chart Content */}
          <div className="p-6">
                {viewMode === 'tabs' ? (
                  <>
                    {activeTab === 'bar' && hasMarketData && (
                      <div id="grouped-bar-chart">
                        <GroupedBarChart 
                          title="Comparative Analysis - Grouped Bars" 
                          height={450}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'line' && hasMarketData && (
                      <div id="line-chart">
                        <MultiLineChart 
                          title="Trend Analysis - Multiple Series" 
                          height={450}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'heatmap' && hasMarketData && (
                      <div id="heatmap-chart">
                        <MatrixHeatmap 
                          title="Matrix View - Geography × Segment" 
                          height={450}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'table' && hasMarketData && (
                      <div id="comparison-table">
                        <ComparisonTable 
                          title="Data Comparison Table" 
                          height={500}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'waterfall' && hasMarketData && (
                      <div id="waterfall-chart">
                        <WaterfallChart 
                          title="Contribution Analysis - Waterfall Chart" 
                          height={450}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'bubble' && hasMarketData && (
                      <div id="bubble-chart">
                        <D3BubbleChartIndependent 
                          title="Coherent Opportunity Matrix" 
                          height={500}
                        />
                      </div>
                    )}
                    
                    {activeTab === 'competitive-intelligence' && hasMarketData && (
                      <div id="competitive-intelligence-chart">
                        <CompetitiveIntelligence 
                          height={600}
                        />
                      </div>
                    )}
                    
                    {hasIntelligenceData && activeTab === 'customer-intelligence' && isChartVisible('customer-intelligence') && (
                      <div id="customer-intelligence-chart">
                        {(() => {
                          const hasProp1 = rawIntelligenceData && rawIntelligenceData.rows && rawIntelligenceData.rows.length > 0
                          const hasProp2 = proposition2Data && proposition2Data.rows && proposition2Data.rows.length > 0
                          const hasProp3 = proposition3Data && proposition3Data.rows && proposition3Data.rows.length > 0
                          
                          if (!hasProp1 && !hasProp2 && !hasProp3) {
                            return (
                              <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-center">
                                  <p className="text-gray-600 font-semibold mb-2">No Data Available</p>
                                  <p className="text-sm text-gray-500">Upload an Excel file from the Dashboard Builder to view data</p>
                                </div>
                              </div>
                            )
                          }
                          
                          return (
                            <div className="w-full">
                              {/* Tab Navigation */}
                              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
                                <div className="flex border-b border-gray-200">
                                  {hasProp1 && (
                                    <button
                                      onClick={() => setActivePropositionTab('prop1')}
                                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                                        activePropositionTab === 'prop1'
                                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                      }`}
                                    >
                                      Basic
                                    </button>
                                  )}
                                  {hasProp2 && (
                                    <button
                                      onClick={() => setActivePropositionTab('prop2')}
                                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                                        activePropositionTab === 'prop2'
                                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                      }`}
                                    >
                                      Advance
                                    </button>
                                  )}
                                  {hasProp3 && (
                                    <button
                                      onClick={() => setActivePropositionTab('prop3')}
                                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                                        activePropositionTab === 'prop3'
                                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                      }`}
                                    >
                                      Premium
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Tab Content */}
                              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                {activePropositionTab === 'prop1' && hasProp1 && (
                                  <RawDataTable
                                    title="Basic"
                                    data={rawIntelligenceData!.rows}
                                    headers={rawIntelligenceData!.headers}
                                    height={600}
                                  />
                                )}
                                
                                {activePropositionTab === 'prop2' && hasProp2 && (
                                  <RawDataTable
                                    title="Advance"
                                    data={proposition2Data!.rows}
                                    headers={proposition2Data!.headers}
                                    height={600}
                                  />
                                )}
                                
                                {activePropositionTab === 'prop3' && hasProp3 && (
                                  <RawDataTable
                                    title="Premium"
                                    data={proposition3Data!.rows}
                                    headers={proposition3Data!.headers}
                                    height={600}
                                  />
                                )}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-8">
                    {hasMarketData && isChartVisible('grouped-bar') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-black mb-4">📊 Grouped Bar Chart</h3>
                        <GroupedBarChart 
                          title="Comparative Analysis - Grouped Bars" 
                          height={400}
                        />
                      </div>
                    )}
                    
                    {hasMarketData && isChartVisible('multi-line') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-black mb-4">📈 Line Chart</h3>
                        <MultiLineChart 
                          title="Trend Analysis - Multiple Series" 
                          height={400}
                        />
                      </div>
                    )}
                    
                    {hasMarketData && isChartVisible('heatmap') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-black mb-4">🔥 Heatmap</h3>
                        <MatrixHeatmap 
                          title="Matrix View - Geography × Segment" 
                          height={400}
                        />
                      </div>
                    )}
                    
                    {hasMarketData && isChartVisible('comparison-table') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-black mb-4">📋 Data Table</h3>
                        <ComparisonTable 
                          title="Data Comparison Table" 
                          height={400}
                        />
                      </div>
                    )}
                    
                    {hasMarketData && isChartVisible('waterfall') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-black mb-4">💧 Waterfall Chart</h3>
                        <WaterfallChart 
                          title="Contribution Analysis - Waterfall Chart" 
                          height={400}
                        />
                      </div>
                    )}
                    
                    {hasMarketData && isChartVisible('bubble') && (
                      <div className="border-b pb-8">
                        <h3 className="text-lg font-semibold text-black mb-4">🫧 Bubble Chart</h3>
                        <D3BubbleChartIndependent 
                          title="Coherent Opportunity Matrix" 
                          height={450}
                        />
                      </div>
                    )}
                    
                    {hasMarketData && isChartVisible('competitive-intelligence') && (
                      <div className="border-b pb-8">
                        <CompetitiveIntelligence 
                          height={600}
                        />
                      </div>
                    )}
                    
                    {hasIntelligenceData && isChartVisible('customer-intelligence') && (
                      <div className="space-y-8">
                        {intelligenceType === 'customer' || (!intelligenceType && customerIntelligenceData) ? (
                          <div className="border-b pb-8">
                            <h3 className="text-lg font-semibold text-black mb-4">👥 Customer Intelligence</h3>
                            <CustomerIntelligenceHeatmap 
                              title="Customer Intelligence - Industry Category × Region" 
                              height={450}
                            />
                          </div>
                        ) : intelligenceType === 'distributor' || (!intelligenceType && distributorIntelligenceData) ? (
                          <div>
                            <h3 className="text-lg font-semibold text-black mb-4">📦 Distributors Intelligence Database</h3>
                            <DistributorsIntelligence 
                              title="Distributors Intelligence Database" 
                              height={500}
                            />
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
        </main>

        {/* Insights Panel - Only show if market data exists */}
        {hasMarketData && showInsights && (
                  <aside className="col-span-12 lg:col-span-3 transition-all duration-300">
                    <div className="sticky top-6">
                      <div className="bg-white rounded-lg shadow-sm">
                        <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-200 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-black flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-yellow-500" />
                              Key Insights
                            </h2>
                            <button
                              onClick={() => {
                                setShowInsights(false)
                                setSidebarCollapsed(false)
                              }}
                              className="rounded-md text-black hover:text-black focus:outline-none"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                          <p className="text-xs text-black mt-1">
                            Auto-generated analysis
                          </p>
                        </div>
                        
                        <div 
                          className="px-4 py-3 overflow-y-auto sidebar-scroll" 
                          style={{ 
                            maxHeight: 'calc(100vh - 8rem)',
                            overflowY: 'auto',
                            minHeight: 'auto'
                          }}
                          id="insights-panel"
                        >
                          <InsightsPanel />
                        </div>
                      </div>
                    </div>
                  </aside>
                )}
              </div>
            </>
          )
        })()}
      </div>
      
      {/* Footer */}
      <Footer />
      
      {/* Dashboard Builder Download Button */}
      
    </div>
  )
}

