"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Upload, Download, Settings, CheckCircle } from "lucide-react"
import type { ValidationRule, HL7Version } from "@/types/hl7"

const HL7_VERSIONS: HL7Version[] = [
  "2.1",
  "2.2",
  "2.3",
  "2.3.1",
  "2.4",
  "2.5",
  "2.5.1",
  "2.6",
  "2.7",
  "2.8",
  "2.8.1",
  "2.8.2",
  "2.9",
]

export function ValidationConfiguration() {
  const [selectedVersion, setSelectedVersion] = useState<HL7Version>("2.5")
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([])
  const [customSchemas, setCustomSchemas] = useState<any[]>([])
  const [globalSettings, setGlobalSettings] = useState({
    autoValidate: true,
    strictMode: false,
    showWarnings: true,
    validateOnEdit: true,
    customSchemaEnabled: false,
  })

  useEffect(() => {
    loadValidationRules()
    loadCustomSchemas()
  }, [selectedVersion])

  const loadValidationRules = async () => {
    try {
      const response = await fetch(`/api/validation/rules?version=${selectedVersion}`)
      const rules = await response.json()
      setValidationRules(rules)
    } catch (error) {
      console.error("Failed to load validation rules:", error)
    }
  }

  const loadCustomSchemas = async () => {
    try {
      const response = await fetch("/api/validation/schemas")
      const schemas = await response.json()
      setCustomSchemas(schemas)
    } catch (error) {
      console.error("Failed to load custom schemas:", error)
    }
  }

  const handleAddRule = () => {
    const newRule: ValidationRule = {
      id: `rule_${Date.now()}`,
      name: "New Validation Rule",
      description: "",
      ruleType: "structure",
      hl7Version: selectedVersion,
      segmentType: "MSH",
      fieldPosition: 1,
      ruleExpression: "field_not_empty",
      severity: "warning",
      isActive: true,
    }
    setValidationRules([...validationRules, newRule])
  }

  const handleUpdateRule = (ruleId: string, updates: Partial<ValidationRule>) => {
    setValidationRules((rules) => rules.map((rule) => (rule.id === ruleId ? { ...rule, ...updates } : rule)))
  }

  const handleDeleteRule = (ruleId: string) => {
    setValidationRules((rules) => rules.filter((rule) => rule.id !== ruleId))
  }

  const handleSaveConfiguration = async () => {
    try {
      await fetch("/api/validation/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: selectedVersion,
          rules: validationRules,
          settings: globalSettings,
        }),
      })
      // Show success message
    } catch (error) {
      console.error("Failed to save configuration:", error)
    }
  }

  const handleImportSchema = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("schema", file)

    try {
      const response = await fetch("/api/validation/schemas/import", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()
      setCustomSchemas([...customSchemas, result])
    } catch (error) {
      console.error("Failed to import schema:", error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>HL7 Validation Configuration</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure validation rules for HL7 v2.x messages (versions 2.1-2.9)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={handleSaveConfiguration}>
                <Settings className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="hl7-version">HL7 Version</Label>
              <Select value={selectedVersion} onValueChange={(value: HL7Version) => setSelectedVersion(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HL7_VERSIONS.map((version) => (
                    <SelectItem key={version} value={version}>
                      HL7 v{version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-validate">Auto Validate</Label>
                <Switch
                  id="auto-validate"
                  checked={globalSettings.autoValidate}
                  onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, autoValidate: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="strict-mode">Strict Mode</Label>
                <Switch
                  id="strict-mode"
                  checked={globalSettings.strictMode}
                  onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, strictMode: checked })}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-warnings">Show Warnings</Label>
                <Switch
                  id="show-warnings"
                  checked={globalSettings.showWarnings}
                  onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, showWarnings: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="validate-on-edit">Validate on Edit</Label>
                <Switch
                  id="validate-on-edit"
                  checked={globalSettings.validateOnEdit}
                  onCheckedChange={(checked) => setGlobalSettings({ ...globalSettings, validateOnEdit: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Validation Rules</TabsTrigger>
          <TabsTrigger value="schemas">Custom Schemas</TabsTrigger>
          <TabsTrigger value="segments">Segment Definitions</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Validation Rules for HL7 v{selectedVersion}</CardTitle>
                <Button onClick={handleAddRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {validationRules.map((rule) => (
                  <Card key={rule.id} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Rule Name</Label>
                        <Input
                          value={rule.name}
                          onChange={(e) => handleUpdateRule(rule.id, { name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Segment Type</Label>
                        <Select
                          value={rule.segmentType || ""}
                          onValueChange={(value) => handleUpdateRule(rule.id, { segmentType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select segment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MSH">MSH - Message Header</SelectItem>
                            <SelectItem value="PID">PID - Patient ID</SelectItem>
                            <SelectItem value="PV1">PV1 - Patient Visit</SelectItem>
                            <SelectItem value="OBX">OBX - Observation</SelectItem>
                            <SelectItem value="OBR">OBR - Observation Request</SelectItem>
                            <SelectItem value="EVN">EVN - Event Type</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Field Position</Label>
                        <Input
                          type="number"
                          value={rule.fieldPosition || ""}
                          onChange={(e) =>
                            handleUpdateRule(rule.id, { fieldPosition: Number.parseInt(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label>Severity</Label>
                        <Select
                          value={rule.severity}
                          onValueChange={(value: "error" | "warning" | "info") =>
                            handleUpdateRule(rule.id, { severity: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="error">Error</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="info">Info</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={rule.description}
                          onChange={(e) => handleUpdateRule(rule.id, { description: e.target.value })}
                          placeholder="Describe what this rule validates..."
                        />
                      </div>
                      <div>
                        <Label>Rule Expression</Label>
                        <Textarea
                          value={rule.ruleExpression}
                          onChange={(e) => handleUpdateRule(rule.id, { ruleExpression: e.target.value })}
                          placeholder="Enter validation expression..."
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) => handleUpdateRule(rule.id, { isActive: checked })}
                        />
                        <Label>Active</Label>
                        <Badge
                          variant={
                            rule.severity === "error"
                              ? "destructive"
                              : rule.severity === "warning"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {rule.severity}
                        </Badge>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schemas">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Custom Schemas</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => document.getElementById("schema-upload")?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Schema
                  </Button>
                  <input
                    id="schema-upload"
                    type="file"
                    accept=".json,.xml,.xsd"
                    onChange={handleImportSchema}
                    className="hidden"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customSchemas.map((schema, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{schema.name}</h4>
                        <p className="text-sm text-muted-foreground">{schema.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge>{schema.type}</Badge>
                          <Badge variant="outline">v{schema.version}</Badge>
                          {schema.isActive && <Badge variant="default">Active</Badge>}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {customSchemas.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No custom schemas imported. Import UK ITK or other custom schemas to extend validation.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle>Segment Definitions for HL7 v{selectedVersion}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {["MSH", "PID", "PV1", "OBX", "OBR", "EVN", "NK1", "AL1", "DG1", "PR1"].map((segment) => (
                  <Card key={segment} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{segment}</h4>
                        <p className="text-xs text-muted-foreground">
                          {segment === "MSH" && "Message Header"}
                          {segment === "PID" && "Patient Identification"}
                          {segment === "PV1" && "Patient Visit"}
                          {segment === "OBX" && "Observation/Result"}
                          {segment === "OBR" && "Observation Request"}
                          {segment === "EVN" && "Event Type"}
                          {segment === "NK1" && "Next of Kin"}
                          {segment === "AL1" && "Patient Allergy"}
                          {segment === "DG1" && "Diagnosis"}
                          {segment === "PR1" && "Procedures"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-xs">Valid</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
