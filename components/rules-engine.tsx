"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Play, Save, Download, Upload, Code, Palette, AlertTriangle } from "lucide-react"

interface CustomRule {
  id: string
  name: string
  description: string
  type: "highlighting" | "validation" | "transformation"
  category: string
  condition: string
  action: string
  priority: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface HighlightingRule {
  id: string
  name: string
  segmentType: string
  fieldPosition?: number
  condition: string
  highlightColor: string
  backgroundColor: string
  textStyle: "normal" | "bold" | "italic"
  isActive: boolean
}

export function RulesEngine() {
  const [customRules, setCustomRules] = useState<CustomRule[]>([])
  const [highlightingRules, setHighlightingRules] = useState<HighlightingRule[]>([])
  const [selectedRule, setSelectedRule] = useState<CustomRule | null>(null)
  const [ruleCode, setRuleCode] = useState("")
  const [testMessage, setTestMessage] = useState("")
  const [testResults, setTestResults] = useState<any[]>([])

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    try {
      const [customResponse, highlightResponse] = await Promise.all([
        fetch("/api/rules/custom"),
        fetch("/api/rules/highlighting"),
      ])
      const customRules = await customResponse.json()
      const highlightingRules = await highlightResponse.json()
      setCustomRules(customRules)
      setHighlightingRules(highlightingRules)
    } catch (error) {
      console.error("Failed to load rules:", error)
    }
  }

  const handleCreateRule = () => {
    const newRule: CustomRule = {
      id: `rule_${Date.now()}`,
      name: "New Custom Rule",
      description: "",
      type: "validation",
      category: "custom",
      condition: "// Define your condition here\nreturn true;",
      action: "// Define your action here\nconsole.log('Rule triggered');",
      priority: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setCustomRules([newRule, ...customRules])
    setSelectedRule(newRule)
    setRuleCode(newRule.condition)
  }

  const handleCreateHighlightRule = () => {
    const newRule: HighlightingRule = {
      id: `highlight_${Date.now()}`,
      name: "New Highlight Rule",
      segmentType: "MSH",
      condition: "field.length > 0",
      highlightColor: "#3b82f6",
      backgroundColor: "#eff6ff",
      textStyle: "normal",
      isActive: true,
    }
    setHighlightingRules([newRule, ...highlightingRules])
  }

  const handleSaveRule = async (rule: CustomRule) => {
    try {
      const response = await fetch(`/api/rules/custom/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rule,
          condition: ruleCode,
          updatedAt: new Date(),
        }),
      })
      const updatedRule = await response.json()
      setCustomRules((rules) => rules.map((r) => (r.id === rule.id ? updatedRule : r)))
      setSelectedRule(updatedRule)
    } catch (error) {
      console.error("Failed to save rule:", error)
    }
  }

  const handleTestRule = async () => {
    if (!selectedRule || !testMessage) return

    try {
      const response = await fetch("/api/rules/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule: { ...selectedRule, condition: ruleCode },
          message: testMessage,
        }),
      })
      const results = await response.json()
      setTestResults(results)
    } catch (error) {
      console.error("Failed to test rule:", error)
    }
  }

  const handleExportRules = async () => {
    try {
      const response = await fetch("/api/rules/export")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `custom_rules_${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to export rules:", error)
    }
  }

  const handleImportRules = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("rules", file)

    try {
      const response = await fetch("/api/rules/import", {
        method: "POST",
        body: formData,
      })
      const importedRules = await response.json()
      setCustomRules([...customRules, ...importedRules])
    } catch (error) {
      console.error("Failed to import rules:", error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Code className="h-5 w-5" />
                <span>Custom Rules Engine</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage custom highlighting and validation rules
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExportRules}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => document.getElementById("rules-import")?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <input id="rules-import" type="file" accept=".json" onChange={handleImportRules} className="hidden" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="custom" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="custom">Custom Rules</TabsTrigger>
          <TabsTrigger value="highlighting">Highlighting Rules</TabsTrigger>
          <TabsTrigger value="testing">Rule Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Rules ({customRules.length})</CardTitle>
                  <Button size="sm" onClick={handleCreateRule}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 max-h-96 overflow-y-auto p-4">
                  {customRules.map((rule) => (
                    <Card
                      key={rule.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedRule?.id === rule.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => {
                        setSelectedRule(rule)
                        setRuleCode(rule.condition)
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium">{rule.name}</h4>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {rule.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {rule.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">Priority: {rule.priority}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className={`h-2 w-2 rounded-full ${rule.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              {selectedRule ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Edit Rule: {selectedRule.name}</CardTitle>
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => handleSaveRule(selectedRule)}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setCustomRules((rules) => rules.filter((r) => r.id !== selectedRule.id))
                            setSelectedRule(null)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Rule Name</Label>
                        <Input
                          value={selectedRule.name}
                          onChange={(e) => setSelectedRule({ ...selectedRule, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={selectedRule.type}
                          onValueChange={(value: "highlighting" | "validation" | "transformation") =>
                            setSelectedRule({ ...selectedRule, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="validation">Validation</SelectItem>
                            <SelectItem value="highlighting">Highlighting</SelectItem>
                            <SelectItem value="transformation">Transformation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={selectedRule.description}
                        onChange={(e) => setSelectedRule({ ...selectedRule, description: e.target.value })}
                        placeholder="Describe what this rule does..."
                      />
                    </div>

                    <div>
                      <Label>Rule Code (JavaScript)</Label>
                      <Textarea
                        value={ruleCode}
                        onChange={(e) => setRuleCode(e.target.value)}
                        className="font-mono text-sm min-h-[200px]"
                        placeholder="// Write your rule logic here
// Available variables: message, segment, field, value
// Return true/false for validation rules
// Return object for highlighting rules"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Category</Label>
                        <Input
                          value={selectedRule.category}
                          onChange={(e) => setSelectedRule({ ...selectedRule, category: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Input
                          type="number"
                          value={selectedRule.priority}
                          onChange={(e) =>
                            setSelectedRule({ ...selectedRule, priority: Number.parseInt(e.target.value) })
                          }
                        />
                      </div>
                      <div className="flex items-center space-x-2 mt-6">
                        <Switch
                          checked={selectedRule.isActive}
                          onCheckedChange={(checked) => setSelectedRule({ ...selectedRule, isActive: checked })}
                        />
                        <Label>Active</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Select a rule to edit or create a new one</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="highlighting">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Highlighting Rules</span>
                </CardTitle>
                <Button onClick={handleCreateHighlightRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Highlight Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {highlightingRules.map((rule) => (
                  <Card key={rule.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Rule Name</Label>
                        <Input
                          value={rule.name}
                          onChange={(e) =>
                            setHighlightingRules((rules) =>
                              rules.map((r) => (r.id === rule.id ? { ...r, name: e.target.value } : r)),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Segment Type</Label>
                        <Select
                          value={rule.segmentType}
                          onValueChange={(value) =>
                            setHighlightingRules((rules) =>
                              rules.map((r) => (r.id === rule.id ? { ...r, segmentType: value } : r)),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MSH">MSH</SelectItem>
                            <SelectItem value="PID">PID</SelectItem>
                            <SelectItem value="PV1">PV1</SelectItem>
                            <SelectItem value="OBX">OBX</SelectItem>
                            <SelectItem value="OBR">OBR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Field Position</Label>
                        <Input
                          type="number"
                          value={rule.fieldPosition || ""}
                          onChange={(e) =>
                            setHighlightingRules((rules) =>
                              rules.map((r) =>
                                r.id === rule.id ? { ...r, fieldPosition: Number.parseInt(e.target.value) } : r,
                              ),
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Text Color</Label>
                        <div className="flex space-x-2">
                          <input
                            type="color"
                            value={rule.highlightColor}
                            onChange={(e) =>
                              setHighlightingRules((rules) =>
                                rules.map((r) => (r.id === rule.id ? { ...r, highlightColor: e.target.value } : r)),
                              )
                            }
                            className="w-12 h-8 rounded border"
                          />
                          <input
                            type="color"
                            value={rule.backgroundColor}
                            onChange={(e) =>
                              setHighlightingRules((rules) =>
                                rules.map((r) => (r.id === rule.id ? { ...r, backgroundColor: e.target.value } : r)),
                              )
                            }
                            className="w-12 h-8 rounded border"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Condition</Label>
                        <Textarea
                          value={rule.condition}
                          onChange={(e) =>
                            setHighlightingRules((rules) =>
                              rules.map((r) => (r.id === rule.id ? { ...r, condition: e.target.value } : r)),
                            )
                          }
                          placeholder="JavaScript condition (e.g., field.includes('ERROR'))"
                        />
                      </div>
                      <div className="flex items-end space-x-2">
                        <div className="flex-1">
                          <Label>Preview</Label>
                          <div
                            className="p-2 border rounded text-sm"
                            style={{
                              color: rule.highlightColor,
                              backgroundColor: rule.backgroundColor,
                              fontWeight: rule.textStyle === "bold" ? "bold" : "normal",
                              fontStyle: rule.textStyle === "italic" ? "italic" : "normal",
                            }}
                          >
                            Sample highlighted text
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setHighlightingRules((rules) => rules.filter((r) => r.id !== rule.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rule Testing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Test Message</Label>
                  <Textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="font-mono text-sm min-h-[200px]"
                    placeholder="Paste an HL7 message to test your rules..."
                  />
                </div>
                <Button onClick={handleTestRule} disabled={!selectedRule || !testMessage}>
                  <Play className="h-4 w-4 mr-2" />
                  Test Rule
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testResults.length > 0 ? (
                    testResults.map((result, index) => (
                      <div key={index} className="p-3 border rounded">
                        <div className="flex items-center space-x-2">
                          {result.passed ? (
                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="text-sm font-medium">{result.passed ? "Rule passed" : "Rule failed"}</span>
                        </div>
                        {result.message && <p className="text-sm text-muted-foreground mt-1">{result.message}</p>}
                        {result.details && (
                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No test results yet. Select a rule and test message to begin.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
