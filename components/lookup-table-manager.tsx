"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Save, X } from "lucide-react"
import type { LookupTable } from "@/types/hl7"

export function LookupTableManager() {
  const [lookupTables, setLookupTables] = useState<LookupTable[]>([])
  const [selectedTable, setSelectedTable] = useState<LookupTable | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingEntry, setEditingEntry] = useState<{ key: string; value: string } | null>(null)

  useEffect(() => {
    fetchLookupTables()
  }, [])

  const fetchLookupTables = async () => {
    try {
      const response = await fetch('/api/lookuptables')
      const result = await response.json()
      setLookupTables(result.data || [])
    } catch (error) {
      console.error('Failed to fetch lookup tables:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createLookupTable = async (tableData: Partial<LookupTable>) => {
    try {
      const response = await fetch('/api/lookuptables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData)
      })
      const result = await response.json()
      if (response.ok) {
        setLookupTables([...lookupTables, result.data])
        setSelectedTable(result.data)
      }
    } catch (error) {
      console.error('Failed to create lookup table:', error)
    }
  }

  const updateLookupTable = async (tableId: string, tableData: Partial<LookupTable>) => {
    try {
      const response = await fetch(`/api/lookuptables/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData)
      })
      const result = await response.json()
      if (response.ok) {
        setLookupTables(lookupTables.map(lt => lt._id === tableId ? result.data : lt))
        setSelectedTable(result.data)
      }
    } catch (error) {
      console.error('Failed to update lookup table:', error)
    }
  }

  const deleteLookupTable = async (tableId: string) => {
    try {
      const response = await fetch(`/api/lookuptables/${tableId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setLookupTables(lookupTables.filter(lt => lt._id !== tableId))
        if (selectedTable?._id === tableId) {
          setSelectedTable(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete lookup table:', error)
    }
  }

  const addEntry = () => {
    setEditingEntry({ key: '', value: '' })
    setIsEditing(true)
  }

  const editEntry = (entry: { key: string; value: string }) => {
    setEditingEntry({ ...entry })
    setIsEditing(true)
  }

  const saveEntry = () => {
    if (!editingEntry || !selectedTable) return

    const existingIndex = selectedTable.data.findIndex(e => e.key === editingEntry.key)
    let updatedData

    if (existingIndex >= 0) {
      // Update existing entry
      updatedData = selectedTable.data.map((entry, index) => 
        index === existingIndex ? editingEntry : entry
      )
    } else {
      // Add new entry
      updatedData = [...selectedTable.data, editingEntry]
    }

    const updatedTable = { ...selectedTable, data: updatedData }
    updateLookupTable(selectedTable._id!, updatedTable)
    setIsEditing(false)
    setEditingEntry(null)
  }

  const deleteEntry = (key: string) => {
    if (!selectedTable) return

    const updatedData = selectedTable.data.filter(entry => entry.key !== key)
    const updatedTable = { ...selectedTable, data: updatedData }
    updateLookupTable(selectedTable._id!, updatedTable)
  }

  if (isLoading) {
    return <div className="p-4">Loading lookup tables...</div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Lookup Tables List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lookup Tables</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Table
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Lookup Table</DialogTitle>
                </DialogHeader>
                <NewLookupTableForm onSubmit={createLookupTable} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {lookupTables.map((table) => (
                <div
                  key={table._id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTable?._id === table._id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedTable(table)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{table.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {table.data.length} entries
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteLookupTable(table._id!)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Table Details */}
      {selectedTable && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedTable.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedTable.description}
                </p>
              </div>
              <Button size="sm" onClick={addEntry}>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTable.data.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{entry.key}</TableCell>
                      <TableCell>{entry.value}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => editEntry(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteEntry(entry.key)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Entry Editor */}
            {isEditing && editingEntry && (
              <div className="mt-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">
                    {selectedTable.data.some(e => e.key === editingEntry.key) ? 'Edit Entry' : 'New Entry'}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" onClick={saveEntry}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false)
                        setEditingEntry(null)
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entry-key">Key</Label>
                    <Input
                      id="entry-key"
                      value={editingEntry.key}
                      onChange={(e) => setEditingEntry({ ...editingEntry, key: e.target.value })}
                      placeholder="Enter key"
                    />
                  </div>
                  <div>
                    <Label htmlFor="entry-value">Value</Label>
                    <Input
                      id="entry-value"
                      value={editingEntry.value}
                      onChange={(e) => setEditingEntry({ ...editingEntry, value: e.target.value })}
                      placeholder="Enter value"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function NewLookupTableForm({ onSubmit }: { onSubmit: (data: Partial<LookupTable>) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, description, data: [] })
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
        Create Lookup Table
      </Button>
    </form>
  )
}
