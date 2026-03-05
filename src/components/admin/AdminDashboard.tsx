'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle, Clock, AlertTriangle, CalendarCheck, LogOut, Image } from 'lucide-react';

interface Lang {
  common: Record<string, string>;
  admin: Record<string, string>;
}

interface Stats {
  totalCheckins: number;
  todayCheckins: number;
  pendingCount: number;
  approvedCount: number;
  flaggedCount: number;
  rankings: Array<{
    id: number;
    phone: string;
    name: string;
    college: string;
    className: string;
    checkInCount: number;
  }>;
}

interface CheckInRecord {
  id: number;
  imageUrl: string;
  thoughts: string;
  status: string;
  isFlagged: boolean;
  exifTime: string | null;
  createdAt: string;
  user: {
    phone: string;
    name: string;
    college: string;
    className: string;
  };
}

type TabType = 'dashboard' | 'records' | 'rankings';

export default function AdminDashboard({ lang }: { lang: Lang }) {
  const { token, logout } = useAdmin();
  const t = lang.admin;
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [approveDialogId, setApproveDialogId] = useState<number | null>(null);
  const [voidDialogId, setVoidDialogId] = useState<number | null>(null);
  const [photoDialogUrl, setPhotoDialogUrl] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers });
      if (res.ok) setStats(await res.json());
    } catch {}
  }, [token]);

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (searchPhone) params.set('phone', searchPhone);
      const res = await fetch(`/api/admin/records?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
        setTotalRecords(data.total);
      }
    } catch {}
  }, [token, page, statusFilter, searchPhone]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'records') fetchRecords();
  }, [activeTab, fetchRecords]);

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInId: id }),
      });
      if (res.ok) {
        setApproveDialogId(null);
        fetchRecords();
        fetchStats();
      }
    } catch {}
  };

  const handleVoid = async (id: number) => {
    try {
      const res = await fetch('/api/admin/void', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInId: id }),
      });
      if (res.ok) {
        setVoidDialogId(null);
        fetchRecords();
        fetchStats();
      }
    } catch {}
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{t.page_title}</h1>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{t.logout}</span>
            </Button>
          </div>
          <nav className="flex gap-1 mt-2">
            {(['dashboard', 'records', 'rankings'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t[tab]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {activeTab === 'dashboard' && stats && (
          <DashboardView stats={stats} t={t} />
        )}
        {activeTab === 'records' && (
          <RecordsView
            records={records}
            totalRecords={totalRecords}
            page={page}
            setPage={setPage}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchPhone={searchPhone}
            setSearchPhone={setSearchPhone}
            onApprove={(id) => setApproveDialogId(id)}
            onVoid={(id) => setVoidDialogId(id)}
            onViewPhoto={(url) => setPhotoDialogUrl(url)}
            t={t}
            formatTime={formatTime}
          />
        )}
        {activeTab === 'rankings' && stats && (
          <RankingsView rankings={stats.rankings} t={t} />
        )}
      </main>

      {/* Approve Dialog */}
      <Dialog open={approveDialogId !== null} onOpenChange={() => setApproveDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.approve}</DialogTitle>
            <DialogDescription>{t.approve_confirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogId(null)}>
              {lang.common.cancel}
            </Button>
            <Button onClick={() => approveDialogId && handleApprove(approveDialogId)}>
              {lang.common.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={voidDialogId !== null} onOpenChange={() => setVoidDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.void}</DialogTitle>
            <DialogDescription>{t.void_confirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialogId(null)}>
              {lang.common.cancel}
            </Button>
            <Button variant="destructive" onClick={() => voidDialogId && handleVoid(voidDialogId)}>
              {lang.common.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Dialog */}
      <Dialog open={photoDialogUrl !== null} onOpenChange={() => setPhotoDialogUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.view_photo}</DialogTitle>
          </DialogHeader>
          {photoDialogUrl && (
            <img src={photoDialogUrl.replace(/^\/uploads\//, '/api/image/')} alt="Check-in" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========== Dashboard ========== */
function DashboardView({ stats, t }: { stats: Stats; t: Record<string, string> }) {
  const cards = [
    { title: t.total_checkins, value: stats.totalCheckins, icon: CheckCircle, color: 'text-blue-600' },
    { title: t.today_checkins, value: stats.todayCheckins, icon: CalendarCheck, color: 'text-green-600' },
    { title: t.pending_review, value: stats.pendingCount, icon: Clock, color: 'text-yellow-600' },
    { title: t.approved_count, value: stats.approvedCount, icon: CheckCircle, color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t.today_overview}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${card.color}`} />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Rankings Preview */}
      {stats.rankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.rankings}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {/* Mobile: card list */}
            <div className="sm:hidden space-y-2">
              {stats.rankings.slice(0, 5).map((user, idx) => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg w-8">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</span>
                    <div>
                      <div className="font-medium text-sm">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.phone} · {user.className}</div>
                    </div>
                  </div>
                  <span className="font-bold">{user.checkInCount}</span>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t.rank}</TableHead>
                    <TableHead>{t.phone}</TableHead>
                    <TableHead>{t.student_name}</TableHead>
                    <TableHead>{t.class_name}</TableHead>
                    <TableHead>{t.college}</TableHead>
                    <TableHead className="text-right">{t.checkin_count}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.rankings.slice(0, 5).map((user, idx) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-bold">{idx + 1}</TableCell>
                      <TableCell className="font-mono">{user.phone}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.className}</TableCell>
                      <TableCell>{user.college}</TableCell>
                      <TableCell className="text-right font-semibold">{user.checkInCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ========== Records ========== */
function RecordsView({
  records,
  totalRecords,
  page,
  setPage,
  statusFilter,
  setStatusFilter,
  searchPhone,
  setSearchPhone,
  onApprove,
  onVoid,
  onViewPhoto,
  t,
  formatTime,
}: {
  records: CheckInRecord[];
  totalRecords: number;
  page: number;
  setPage: (p: number) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  searchPhone: string;
  setSearchPhone: (s: string) => void;
  onApprove: (id: number) => void;
  onVoid: (id: number) => void;
  onViewPhoto: (url: string) => void;
  t: Record<string, string>;
  formatTime: (iso: string) => string;
}) {
  const totalPages = Math.ceil(totalRecords / 20);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2 sm:flex-wrap">
        <Input
          placeholder={t.phone}
          value={searchPhone}
          onChange={(e) => { setSearchPhone(e.target.value); setPage(1); }}
          className="w-full sm:w-48"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{t.status}:</span>
          {['', 'PENDING', 'APPROVED', 'VOIDED'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s === '' ? t.all : s === 'PENDING' ? t.pending : s === 'APPROVED' ? t.approved : t.voided}
            </Button>
          ))}
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-3">
        {records.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t.no_records}
            </CardContent>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id} className={record.status === 'PENDING' ? 'border-red-300 bg-red-50' : record.status === 'VOIDED' ? 'border-gray-300 bg-gray-50 opacity-60' : ''}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{record.user.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">{record.user.phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {record.status === 'APPROVED' ? (
                      <Badge variant="success">{t.approved}</Badge>
                    ) : record.status === 'VOIDED' ? (
                      <Badge variant="secondary">{t.voided}</Badge>
                    ) : (
                      <Badge variant="destructive">{t.pending}</Badge>
                    )}
                    {record.isFlagged && (
                      <Badge variant="warning">
                        <AlertTriangle className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{record.user.className} · {record.user.college}</div>
                <p className="text-sm line-clamp-2">{record.thoughts}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">{formatTime(record.createdAt)}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onViewPhoto(record.imageUrl)}>
                      <Image className="h-3 w-3 mr-1" />{t.photo}
                    </Button>
                    {record.status === 'PENDING' && (
                      <Button size="sm" onClick={() => onApprove(record.id)}>
                        {t.approve}
                      </Button>
                    )}
                    {record.status !== 'VOIDED' && (
                      <Button variant="destructive" size="sm" onClick={() => onVoid(record.id)}>
                        {t.void}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.phone}</TableHead>
                  <TableHead>{t.student_name}</TableHead>
                  <TableHead>{t.class_name}</TableHead>
                  <TableHead>{t.college}</TableHead>
                  <TableHead>{t.thoughts}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.time}</TableHead>
                  <TableHead>{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t.no_records}
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow
                      key={record.id}
                      className={record.status === 'PENDING' ? 'bg-red-50' : record.status === 'VOIDED' ? 'bg-gray-50 opacity-60' : ''}
                    >
                      <TableCell className="font-mono">{record.user.phone}</TableCell>
                      <TableCell>{record.user.name}</TableCell>
                      <TableCell>{record.user.className}</TableCell>
                      <TableCell>{record.user.college}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{record.thoughts}</TableCell>
                      <TableCell>
                        {record.status === 'APPROVED' ? (
                          <Badge variant="success">{t.approved}</Badge>
                        ) : record.status === 'VOIDED' ? (
                          <Badge variant="secondary">{t.voided}</Badge>
                        ) : (
                          <Badge variant="destructive">{t.pending}</Badge>
                        )}
                        {record.isFlagged && (
                          <Badge variant="warning" className="ml-1">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {t.flagged}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTime(record.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewPhoto(record.imageUrl)}
                          >
                            <Image className="h-3 w-3" />
                          </Button>
                          {record.status === 'PENDING' && (
                            <Button
                              size="sm"
                              onClick={() => onApprove(record.id)}
                            >
                              {t.approve}
                            </Button>
                          )}
                          {record.status !== 'VOIDED' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onVoid(record.id)}
                            >
                              {t.void}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            &lt;
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            &gt;
          </Button>
        </div>
      )}
    </div>
  );
}

/* ========== Rankings ========== */
function RankingsView({
  rankings,
  t,
}: {
  rankings: Stats['rankings'];
  t: Record<string, string>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.rankings}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
        {/* Mobile: card list */}
        <div className="sm:hidden space-y-2">
          {rankings.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{t.no_records}</p>
          ) : (
            rankings.map((user, idx) => (
              <div key={user.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg w-8 text-center">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </span>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.phone} · {user.className} · {user.college}</div>
                  </div>
                </div>
                <span className="font-bold text-lg">{user.checkInCount}</span>
              </div>
            ))
          )}
        </div>
        {/* Desktop: table */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t.rank}</TableHead>
                <TableHead>{t.phone}</TableHead>
                <TableHead>{t.student_name}</TableHead>
                <TableHead>{t.class_name}</TableHead>
                <TableHead>{t.college}</TableHead>
                <TableHead className="text-right">{t.checkin_count}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t.no_records}
                  </TableCell>
                </TableRow>
              ) : (
                rankings.map((user, idx) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <span className={`font-bold ${idx < 3 ? 'text-lg' : ''}`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">{user.phone}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.className}</TableCell>
                    <TableCell>{user.college}</TableCell>
                    <TableCell className="text-right font-bold text-lg">{user.checkInCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
