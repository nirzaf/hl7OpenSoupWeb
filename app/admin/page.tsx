"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Database, Shield, FileText, Table, Workflow } from "lucide-react"
import { RuleSetManager } from "@/components/rule-set-manager"
import { LookupTableManager } from "@/components/lookup-table-manager"

export default function AdminPage() {
  const [isInitializing, setIsInitializing] = useState(false)
  const [initStatus, setInitStatus] = useState<string | null>(null)

  const initializeDatabase = async () => {
    setIsInitializing(true)
    setInitStatus(null)
    
    try {
      const response = await fetch('/api/init', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (response.ok) {
        setInitStatus('Database initialized successfully!')
      } else {
        setInitStatus(`Initialization failed: ${result.error}`)
      }
    } catch (error) {
      setInitStatus(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsInitializing(false)
    }
  }

  const seedDatabase = async () => {
    setIsInitializing(true)
    setInitStatus(null)
    
    try {
      const response = await fetch('/api/seed', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (response.ok) {
        setInitStatus(`Database seeded successfully! ${result.message}`)
      } else {
        setInitStatus(`Seeding failed: ${result.error}`)
      }
    } catch (error) {
      setInitStatus(`Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">HL7 OpenSoup Administration</h1>
        <p className="text-muted-foreground mt-2">
          Manage rule sets, lookup tables, workflows, and system configuration
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="rulesets" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Rule Sets</span>
          </TabsTrigger>
          <TabsTrigger value="lookuptables" className="flex items-center space-x-2">
            <Table className="h-4 w-4" />
            <span>Lookup Tables</span>
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center space-x-2">
            <Workflow className="h-4 w-4" />
            <span>Workflows</span>
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Database</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Rule Sets</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  3 system, 9 custom
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lookup Tables</CardTitle>
                <Table className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  456 total entries
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Validation Rate</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">98.5%</div>
                <p className="text-xs text-muted-foreground">
                  +2.1% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New rule set created</p>
                      <p className="text-xs text-muted-foreground">UK ITK Validation Rules - 2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Lookup table updated</p>
                      <p className="text-xs text-muted-foreground">Ward Codes - 15 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Message validation completed</p>
                      <p className="text-xs text-muted-foreground">Batch of 50 messages - 1 hour ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Connection</span>
                    <Badge variant="default">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">HL7 Parser</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Validation Engine</span>
                    <Badge variant="default">Running</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Endpoints</span>
                    <Badge variant="default">Healthy</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rulesets">
          <RuleSetManager />
        </TabsContent>

        <TabsContent value="lookuptables">
          <LookupTableManager />
        </TabsContent>

        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create and manage automated workflows for message processing
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Workflow management interface coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Management</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Initialize database collections, indexes, and seed data
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Button 
                      onClick={initializeDatabase}
                      disabled={isInitializing}
                    >
                      <Database className="h-4 w-4 mr-2" />
                      {isInitializing ? 'Initializing...' : 'Initialize Database'}
                    </Button>
                    <Button 
                      onClick={seedDatabase}
                      disabled={isInitializing}
                      variant="outline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {isInitializing ? 'Seeding...' : 'Seed Sample Data'}
                    </Button>
                  </div>
                  
                  {initStatus && (
                    <div className={`p-3 rounded-lg ${
                      initStatus.includes('successfully') 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {initStatus}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">1,234</div>
                    <div className="text-sm text-muted-foreground">Messages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-sm text-muted-foreground">Rule Sets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">8</div>
                    <div className="text-sm text-muted-foreground">Lookup Tables</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">3</div>
                    <div className="text-sm text-muted-foreground">Workflows</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security & Compliance</CardTitle>
              <p className="text-sm text-muted-foreground">
                HIPAA compliance, encryption, and security settings
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Security management interface coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
