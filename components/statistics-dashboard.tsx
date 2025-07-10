"use client"

import { useState, useEffect } from "react"
import type { HL7Message } from "@/types/hl7"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, TrendingUp, MessageSquare, Building, AlertTriangle, CheckCircle } from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts"

interface StatisticsDashboardProps {
  messages: HL7Message[]
}

interface MessageStats {
  totalMessages: number
  messageTypes: Record<string, number>
  facilitiesStats: Record<string, number>
  dailyVolume: Array<{ date: string; count: number }>
  validationStats: {
    valid: number
    invalid: number
    warnings: number
  }
  recentActivity: Array<{
    date: string
    action: string
    count: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export function StatisticsDashboard({ messages }: StatisticsDashboardProps) {
  const [stats, setStats] = useState<MessageStats | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    calculateStats()
  }, [messages, timeRange])

  const calculateStats = () => {
    setIsLoading(true)
    
    if (!Array.isArray(messages) || messages.length === 0) {
      setStats({
        totalMessages: 0,
        messageTypes: {},
        facilitiesStats: {},
        dailyVolume: [],
        validationStats: { valid: 0, invalid: 0, warnings: 0 },
        recentActivity: []
      })
      setIsLoading(false)
      return
    }

    // Filter messages by time range
    const now = new Date()
    const cutoffDate = new Date()
    
    switch (timeRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case '30d':
        cutoffDate.setDate(now.getDate() - 30)
        break
      case '90d':
        cutoffDate.setDate(now.getDate() - 90)
        break
      case 'all':
        cutoffDate.setFullYear(2000) // Far in the past
        break
    }

    const filteredMessages = messages.filter(msg => {
      const msgDate = new Date(msg.createdAt || msg.updatedAt || Date.now())
      return msgDate >= cutoffDate
    })

    // Calculate message types
    const messageTypes: Record<string, number> = {}
    const facilitiesStats: Record<string, number> = {}
    const dailyVolumeMap: Record<string, number> = {}
    
    let validCount = 0
    let invalidCount = 0
    let warningCount = 0

    filteredMessages.forEach(msg => {
      // Message types from metadata
      const msgType = msg.metadata?.messageType || 'Unknown'
      messageTypes[msgType] = (messageTypes[msgType] || 0) + 1

      // Facilities stats
      const facility = msg.metadata?.sendingFacility || 'Unknown'
      facilitiesStats[facility] = (facilitiesStats[facility] || 0) + 1

      // Daily volume
      const date = new Date(msg.createdAt || msg.updatedAt || Date.now())
      const dateKey = date.toISOString().split('T')[0]
      dailyVolumeMap[dateKey] = (dailyVolumeMap[dateKey] || 0) + 1

      // Validation stats (simplified)
      if (msg.isValid === true) {
        validCount++
      } else if (msg.isValid === false) {
        invalidCount++
      } else {
        warningCount++
      }
    })

    // Convert daily volume to array and sort
    const dailyVolume = Object.entries(dailyVolumeMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Generate recent activity (simplified)
    const recentActivity = dailyVolume.slice(-7).map(item => ({
      date: item.date,
      action: 'Messages Processed',
      count: item.count
    }))

    setStats({
      totalMessages: filteredMessages.length,
      messageTypes,
      facilitiesStats,
      dailyVolume,
      validationStats: {
        valid: validCount,
        invalid: invalidCount,
        warnings: warningCount
      },
      recentActivity
    })
    
    setIsLoading(false)
  }

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const messageTypeData = Object.entries(stats.messageTypes).map(([type, count]) => ({
    name: type,
    value: count
  }))

  const facilitiesData = Object.entries(stats.facilitiesStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([facility, count]) => ({
      name: facility.length > 15 ? facility.substring(0, 15) + '...' : facility,
      count
    }))

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Message processing statistics and trends</p>
        </div>
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valid Messages</p>
                <p className="text-2xl font-bold">{stats.validationStats.valid}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalMessages > 0 ? Math.round((stats.validationStats.valid / stats.totalMessages) * 100) : 0}% success rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Facilities</p>
                <p className="text-2xl font-bold">{Object.keys(stats.facilitiesStats).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Daily Volume</p>
                <p className="text-2xl font-bold">
                  {stats.dailyVolume.length > 0 
                    ? Math.round(stats.totalMessages / Math.max(stats.dailyVolume.length, 1))
                    : 0
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Volume Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Message Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [value, 'Messages']}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Message Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Message Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={messageTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {messageTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Facilities */}
        <Card>
          <CardHeader>
            <CardTitle>Top Sending Facilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={facilitiesData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Validation Status */}
        <Card>
          <CardHeader>
            <CardTitle>Validation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Valid</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.validationStats.valid}</span>
                  <Badge variant="outline" className="text-green-600">
                    {stats.totalMessages > 0 ? Math.round((stats.validationStats.valid / stats.totalMessages) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Warnings</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.validationStats.warnings}</span>
                  <Badge variant="outline" className="text-yellow-600">
                    {stats.totalMessages > 0 ? Math.round((stats.validationStats.warnings / stats.totalMessages) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Invalid</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.validationStats.invalid}</span>
                  <Badge variant="outline" className="text-red-600">
                    {stats.totalMessages > 0 ? Math.round((stats.validationStats.invalid / stats.totalMessages) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
