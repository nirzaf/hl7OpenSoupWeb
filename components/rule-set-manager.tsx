"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, Save, X } from "lucide-react"
import type { RuleSet, ValidationRule } from "@/types/hl7"

export function RuleSetManager() {
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([])
  const [selectedRuleSet, setSelectedRuleSet] = useState<RuleSet | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null)

  useEffect(() => {
    fetchRuleSets()
  }, [])

  const fetchRuleSets = async () => {
    try {
      const response = await fetch('/api/rulesets')
      const result = await response.json()
      setRuleSets(result.data || [])
    } catch (error) {
      console.error('Failed to fetch rule sets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createRuleSet = async (ruleSetData: Partial<RuleSet>) => {
    try {
      const response = await fetch('/api/rulesets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleSetData)
      })
      const result = await response.json()
      if (response.ok) {
        setRuleSets([...ruleSets, result.data])
        setSelectedRuleSet(result.data)
      }
    } catch (error) {
      console.error('Failed to create rule set:', error)
    }
  }

  const updateRuleSet = async (ruleSetId: string, ruleSetData: Partial<RuleSet>) => {
    try {
      const response = await fetch(`/api/rulesets/${ruleSetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleSetData)
      })
      const result = await response.json()
      if (response.ok) {
        setRuleSets(ruleSets.map(rs => rs._id === ruleSetId ? result.data : rs))
        setSelectedRuleSet(result.data)
      }
    } catch (error) {
      console.error('Failed to update rule set:', error)
    }
  }

  const deleteRuleSet = async (ruleSetId: string) => {
    try {
      const response = await fetch(`/api/rulesets/${ruleSetId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setRuleSets(ruleSets.filter(rs => rs._id !== ruleSetId))
        if (selectedRuleSet?._id === ruleSetId) {
          setSelectedRuleSet(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete rule set:', error)
    }
  }

  const addRule = () => {
    const newRule: ValidationRule = {
      name: 'New Rule',
      description: '',
      ruleType: 'custom',
      hl7Version: '2.5',
      targetPath: '',
      condition: 'exists',
      action: 'warning',
      severity: 'warning',
      isActive: true
    }
    setEditingRule(newRule)
    setIsEditing(true)
  }

  const editRule = (rule: ValidationRule) => {
    setEditingRule({ ...rule })
    setIsEditing(true)
  }

  const saveRule = () => {
    if (!editingRule || !selectedRuleSet) return

    const updatedRules = editingRule._id
      ? selectedRuleSet.rules.map(r => r._id === editingRule._id ? editingRule : r)
      : [...selectedRuleSet.rules, editingRule]

    const updatedRuleSet = { ...selectedRuleSet, rules: updatedRules }
    updateRuleSet(selectedRuleSet._id!, updatedRuleSet)
    setIsEditing(false)
    setEditingRule(null)
  }

  const deleteRule = (ruleId: string) => {
    if (!selectedRuleSet) return

    const updatedRules = selectedRuleSet.rules.filter(r => r._id !== ruleId)
    const updatedRuleSet = { ...selectedRuleSet, rules: updatedRules }
    updateRuleSet(selectedRuleSet._id!, updatedRuleSet)
  }

  if (isLoading) {
    return <div className="p-4">Loading rule sets...</div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Rule Sets List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rule Sets</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Rule Set
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Rule Set</DialogTitle>
                </DialogHeader>
                <NewRuleSetForm onSubmit={createRuleSet} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {ruleSets.map((ruleSet) => (
                <div
                  key={ruleSet._id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRuleSet?._id === ruleSet._id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedRuleSet(ruleSet)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{ruleSet.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {ruleSet.rules.length} rules
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {ruleSet.isSystemDefined && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                      {!ruleSet.isSystemDefined && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteRuleSet(ruleSet._id!)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rule Set Details */}
      {selectedRuleSet && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{selectedRuleSet.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedRuleSet.description}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Rules</span>
                  <Button size="sm" onClick={addRule} disabled={selectedRuleSet.isSystemDefined}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {selectedRuleSet.rules.map((rule, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium">{rule.name}</h5>
                            <p className="text-sm text-muted-foreground">
                              {rule.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {rule.targetPath}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {rule.condition}
                              </Badge>
                              <Badge 
                                variant={rule.severity === 'error' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {rule.severity}
                              </Badge>
                              <Switch
                                checked={rule.isActive}
                                onCheckedChange={(checked) => {
                                  const updatedRule = { ...rule, isActive: checked }
                                  const updatedRules = selectedRuleSet.rules.map(r => 
                                    r === rule ? updatedRule : r
                                  )
                                  updateRuleSet(selectedRuleSet._id!, { 
                                    ...selectedRuleSet, 
                                    rules: updatedRules 
                                  })
                                }}
                                disabled={selectedRuleSet.isSystemDefined}
                              />
                            </div>
                          </div>
                          {!selectedRuleSet.isSystemDefined && (
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => editRule(rule)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteRule(rule._id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Rule Editor */}
          {isEditing && editingRule && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {editingRule._id ? 'Edit Rule' : 'New Rule'}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" onClick={saveRule}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false)
                        setEditingRule(null)
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <RuleEditor rule={editingRule} onChange={setEditingRule} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function NewRuleSetForm({ onSubmit }: { onSubmit: (data: Partial<RuleSet>) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, description, rules: [] })
    setName('')
    setDescription('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={!name || !description}>
        Create Rule Set
      </Button>
    </form>
  )
}

function RuleEditor({ 
  rule, 
  onChange 
}: { 
  rule: ValidationRule
  onChange: (rule: ValidationRule) => void 
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="rule-name">Name</Label>
        <Input
          id="rule-name"
          value={rule.name}
          onChange={(e) => onChange({ ...rule, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="rule-description">Description</Label>
        <Textarea
          id="rule-description"
          value={rule.description}
          onChange={(e) => onChange({ ...rule, description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="rule-target-path">Target Path</Label>
        <Input
          id="rule-target-path"
          value={rule.targetPath || ''}
          onChange={(e) => onChange({ ...rule, targetPath: e.target.value })}
          placeholder="e.g., MSH.9, PID.3"
        />
      </div>
      <div>
        <Label htmlFor="rule-condition">Condition</Label>
        <Select
          value={rule.condition}
          onValueChange={(value) => onChange({ ...rule, condition: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exists">Exists</SelectItem>
            <SelectItem value="not_exists">Not Exists</SelectItem>
            <SelectItem value="equals">Equals</SelectItem>
            <SelectItem value="not_equals">Not Equals</SelectItem>
            <SelectItem value="startsWith">Starts With</SelectItem>
            <SelectItem value="endsWith">Ends With</SelectItem>
            <SelectItem value="contains">Contains</SelectItem>
            <SelectItem value="matchesRegex">Matches Regex</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="rule-value">Value</Label>
        <Input
          id="rule-value"
          value={rule.value || ''}
          onChange={(e) => onChange({ ...rule, value: e.target.value })}
          placeholder="Value to compare against"
        />
      </div>
      <div>
        <Label htmlFor="rule-severity">Severity</Label>
        <Select
          value={rule.severity}
          onValueChange={(value) => onChange({ ...rule, severity: value as any })}
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
      <div>
        <Label htmlFor="rule-action-detail">Action Detail</Label>
        <Input
          id="rule-action-detail"
          value={rule.actionDetail || ''}
          onChange={(e) => onChange({ ...rule, actionDetail: e.target.value })}
          placeholder="Custom message for this rule"
        />
      </div>
    </div>
  )
}
