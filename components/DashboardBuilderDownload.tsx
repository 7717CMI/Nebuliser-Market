'use client'

import { useState } from 'react'
import { useDashboardStore } from '@/lib/store'
import { Download, Loader2, CheckCircle2 } from 'lucide-react'

export function DashboardBuilderDownload() {
  const { fromDashboardBuilder, dashboardBuilderFiles } = useDashboardStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState<'idle' | 'generating' | 'success'>('idle')

  if (!fromDashboardBuilder || !dashboardBuilderFiles) {
    return null
  }

  const handleDownload = async () => {
    if (!dashboardBuilderFiles.valueFile) {
      return
    }

    setIsGenerating(true)
    setStatus('generating')

    try {
      const formData = new FormData()
      formData.append('valueFile', dashboardBuilderFiles.valueFile)
      if (dashboardBuilderFiles.volumeFile) {
        formData.append('volumeFile', dashboardBuilderFiles.volumeFile)
      }
      formData.append('projectName', dashboardBuilderFiles.projectName)

      const response = await fetch('/api/generate-dashboard', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Failed to generate dashboard')
      }

      // Get the zip file as blob
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      // Auto-download the file
      const a = document.createElement('a')
      a.href = url
      a.download = `${dashboardBuilderFiles.projectName}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (error) {
      console.error('Error generating dashboard:', error)
      alert(error instanceof Error ? error.message : 'An error occurred while generating the dashboard')
      setStatus('idle')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-black mb-1">Ready to Deploy?</h3>
            <p className="text-xs text-gray-600">
              Generate and download your deployment package
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Package
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}



