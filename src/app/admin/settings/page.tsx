"use client"

import { useState, useEffect } from "react"
import { Save, Shield, Bell, Database, Globe, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    // Security Settings
    requireEmailVerification: true,
    enableTwoFactor: false,
    maxLoginAttempts: 5,
    sessionTimeout: 24, // hours
    
    // Content Moderation  
    autoModerationEnabled: true,
    flaggedContentAction: "review", // review, hide, delete
    moderationNotifications: true,
    
    // System Settings
    maxUploadSize: 10, // MB
    allowedFileTypes: "jpg,png,jpeg,webp",
    enableAuditLogging: true,
    auditRetentionDays: 90,
    
    // Notifications
    adminEmailAlerts: true,
    userReportNotifications: true,
    systemMaintenanceMode: false,

    // Announcement Settings
    announcementMessage: "",
    announcementType: "info" as "info" | "success" | "warning" | "error",
    announcementActive: false,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasActiveAnnouncement, setHasActiveAnnouncement] = useState(false)

  useEffect(() => {
    async function loadAnnouncementSettings() {
      try {
        const response = await fetch('/api/announcements/current')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setSettings(prev => ({
              ...prev,
              announcementMessage: data.data.message || "",
              announcementType: data.data.type || "info",
              announcementActive: true,
            }))
            setHasActiveAnnouncement(true)
          }
        }
      } catch (error) {
        console.error('Failed to load announcement settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnnouncementSettings()
  }, [])

  const handleSave = async () => {
    // Validate announcement only if it's toggled ON
    if (settings.announcementActive && !settings.announcementMessage.trim()) {
      toast.error('Please enter an announcement message or turn off the announcement toggle')
      return
    }

    setIsSaving(true)
    try {
      // Handle announcement settings
      if (settings.announcementActive && settings.announcementMessage.trim()) {
        // Create/update announcement
        const announcementResponse = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: settings.announcementMessage.trim(),
            type: settings.announcementType,
          }),
        })

        const data = await announcementResponse.json()

        if (!announcementResponse.ok) {
          throw new Error(data.message || 'Failed to save announcement')
        }

        setHasActiveAnnouncement(true)
      } else if (!settings.announcementActive && hasActiveAnnouncement) {
        // Delete announcement if toggled off
        const deleteResponse = await fetch('/api/admin/announcements', {
          method: 'DELETE',
        })

        const data = await deleteResponse.json()

        if (!deleteResponse.ok) {
          throw new Error(data.message || 'Failed to delete announcement')
        }

        setHasActiveAnnouncement(false)
      }

      // TODO: Save other settings to API

      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (key: string, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">
            Configure platform security, moderation, and system settings
          </p>
        </div>
        
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Email Verification Required</Label>
                <p className="text-xs text-muted-foreground">
                  Users must verify their email to access the platform
                </p>
              </div>
              <Switch
                checked={settings.requireEmailVerification}
                onCheckedChange={(checked) => updateSetting('requireEmailVerification', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Two-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground">
                  Enable 2FA for admin accounts
                </p>
              </div>
              <Switch
                checked={settings.enableTwoFactor}
                onCheckedChange={(checked) => updateSetting('enableTwoFactor', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min="1"
                max="10"
                value={settings.maxLoginAttempts}
                onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="1"
                max="72"
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Content Moderation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Content Moderation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto-Moderation</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically scan uploaded images for inappropriate content
                </p>
              </div>
              <Switch
                checked={settings.autoModerationEnabled}
                onCheckedChange={(checked) => updateSetting('autoModerationEnabled', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="flaggedContentAction">Flagged Content Action</Label>
              <Select
                value={settings.flaggedContentAction}
                onValueChange={(value) => updateSetting('flaggedContentAction', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="review">Review Manually</SelectItem>
                  <SelectItem value="hide">Hide Automatically</SelectItem>
                  <SelectItem value="delete">Delete Automatically</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Moderation Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when content is flagged
                </p>
              </div>
              <Switch
                checked={settings.moderationNotifications}
                onCheckedChange={(checked) => updateSetting('moderationNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxUploadSize">Max Upload Size (MB)</Label>
              <Input
                id="maxUploadSize"
                type="number"
                min="1"
                max="100"
                value={settings.maxUploadSize}
                onChange={(e) => updateSetting('maxUploadSize', parseInt(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
              <Input
                id="allowedFileTypes"
                placeholder="jpg,png,jpeg,webp"
                value={settings.allowedFileTypes}
                onChange={(e) => updateSetting('allowedFileTypes', e.target.value)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Audit Logging</Label>
                <p className="text-xs text-muted-foreground">
                  Log all administrative actions
                </p>
              </div>
              <Switch
                checked={settings.enableAuditLogging}
                onCheckedChange={(checked) => updateSetting('enableAuditLogging', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="auditRetentionDays">Audit Log Retention (days)</Label>
              <Input
                id="auditRetentionDays"
                type="number"
                min="1"
                max="365"
                value={settings.auditRetentionDays}
                onChange={(e) => updateSetting('auditRetentionDays', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Admin Email Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Receive email alerts for critical events
                </p>
              </div>
              <Switch
                checked={settings.adminEmailAlerts}
                onCheckedChange={(checked) => updateSetting('adminEmailAlerts', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>User Report Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when users report content
                </p>
              </div>
              <Switch
                checked={settings.userReportNotifications}
                onCheckedChange={(checked) => updateSetting('userReportNotifications', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Temporarily disable user access
                </p>
              </div>
              <Switch
                checked={settings.systemMaintenanceMode}
                onCheckedChange={(checked) => updateSetting('systemMaintenanceMode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Site-wide Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Show Announcement</Label>
                <p className="text-xs text-muted-foreground">
                  Display a banner announcement to all users
                </p>
              </div>
              <Switch
                checked={settings.announcementActive}
                onCheckedChange={(checked) => updateSetting('announcementActive', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="announcementType">Announcement Type</Label>
              <Select
                value={settings.announcementType}
                onValueChange={(value) => updateSetting('announcementType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (Blue)</SelectItem>
                  <SelectItem value="success">Success (Green)</SelectItem>
                  <SelectItem value="warning">Warning (Yellow)</SelectItem>
                  <SelectItem value="error">Error (Red)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="announcementMessage">Announcement Message</Label>
              <Textarea
                id="announcementMessage"
                placeholder="Enter your announcement message..."
                value={settings.announcementMessage}
                onChange={(e) => updateSetting('announcementMessage', e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {settings.announcementMessage.length}/500 characters. HTML is supported for links and formatting.
              </p>
            </div>

            {settings.announcementActive && settings.announcementMessage && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <div className={`p-3 rounded-md border ${
                  settings.announcementType === 'info' ? 'border-blue-200 bg-blue-50 text-blue-800' :
                  settings.announcementType === 'success' ? 'border-green-200 bg-green-50 text-green-800' :
                  settings.announcementType === 'warning' ? 'border-yellow-200 bg-yellow-50 text-yellow-800' :
                  'border-red-200 bg-red-50 text-red-800'
                }`}>
                  <span dangerouslySetInnerHTML={{ __html: settings.announcementMessage }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}