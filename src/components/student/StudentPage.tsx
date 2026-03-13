'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, RefreshCw, Users, CalendarCheck } from 'lucide-react';

interface Lang {
  common: Record<string, string>;
  student: Record<string, string>;
}

export default function StudentPage({ lang }: { lang: Lang }) {
  const [phone, setPhone] = useState('');
  const [className, setClassName] = useState('');
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [siteStats, setSiteStats] = useState<{ totalCheckins: number; todayCheckins: number } | null>(null);
  const [checkInCount, setCheckInCount] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoRef = useRef<File | null>(null);

  const t = lang.student;
  const tc = lang.common;

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('student_info');
    if (saved) {
      try {
        const info = JSON.parse(saved);
        setPhone(info.phone || '');
        setClassName(info.className || '');
        setName(info.name || '');
        setCollege(info.college || '');
      } catch {}
    }
  }, []);

  // Fetch site stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) setSiteStats(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch student check-in count when phone is valid
  useEffect(() => {
    if (!/^\d{5,15}$/.test(phone)) {
      setCheckInCount(null);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/student?phone=${phone}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setCheckInCount(data.checkInCount); })
      .catch(() => {});
    return () => controller.abort();
  }, [phone]);

  // Save to localStorage
  useEffect(() => {
    if (phone || name || college || className) {
      localStorage.setItem('student_info', JSON.stringify({ phone, className, name, college }));
    }
  }, [phone, className, name, college]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraReady(false);
  }, []);

  const startCamera = async () => {
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setCameraError(true);
    }
  };

  // Bind stream to video element after it renders
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      const onReady = () => setCameraReady(true);
      // If video is already ready, set immediately; otherwise wait
      if (video.readyState >= 3) {
        onReady();
      } else {
        video.addEventListener('canplay', onReady, { once: true });
      }
      video.play().catch(() => {});
      return () => {
        video.removeEventListener('canplay', onReady);
      };
    }
  }, [cameraActive]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob || blob.size < 1000) return;
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      photoRef.current = file;
      setPhotoPreview(canvas.toDataURL('image/jpeg', 0.9));
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const resetPhoto = () => {
    photoRef.current = null;
    setPhotoPreview(null);
  };

  const handleSubmit = async () => {
    if (!phone || !name || !college || !className || !thoughts) {
      setMessage({ text: t.fill_all_fields, type: 'error' });
      return;
    }
    if (!/^\d{5,15}$/.test(phone)) {
      setMessage({ text: t.phone_invalid, type: 'error' });
      return;
    }
    if (thoughts.length < 10) {
      setMessage({ text: t.thoughts_too_short, type: 'error' });
      return;
    }
    const currentPhoto = photoRef.current;
    if (!currentPhoto) {
      setMessage({ text: t.photo_required, type: 'error' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('phone', phone);
      formData.append('className', className);
      formData.append('name', name);
      formData.append('college', college);
      formData.append('thoughts', thoughts);
      formData.append('photo', currentPhoto);
      formData.append('liveCapture', 'true');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!data) {
        setMessage({ text: `${tc.error} (${res.status})`, type: 'error' });
        return;
      }

      if (res.ok) {
        if (data.isFlagged) {
          setMessage({ text: data.message, type: 'warning' });
        } else {
          setMessage({ text: data.message, type: 'success' });
        }
        setThoughts('');
        resetPhoto();
        fetchStats();
        if (data.checkInCount !== undefined) setCheckInCount(data.checkInCount);
      } else {
        setMessage({ text: data.error || tc.error, type: 'error' });
      }
    } catch {
      setMessage({ text: tc.error, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName = "border-gray-300 focus:border-[#2E7D32] focus:ring-[#2E7D32] focus-visible:ring-[#2E7D32]";

  return (
    <div className="min-h-screen bg-white">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Content */}
      <main className="max-w-lg mx-auto sm:px-4 sm:py-6">
        {/* Message */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : message.type === 'warning' ? 'warning' : 'success'} className="rounded-none sm:rounded-lg sm:mb-4">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <Card className="rounded-none border-x-0 sm:rounded-lg sm:border-x shadow-sm overflow-hidden">
          {/* Banner */}
          <img src="/banner.jpg" alt={tc.app_title} className="w-full h-auto" />

          {/* Header */}
          <div className="py-4 px-4 text-center border-b border-[#E8F5E9] bg-[#f0f9f0]">
            <h1 className="text-2xl font-bold text-[#2E7D32]">"光盘行动" 30天打卡挑战</h1>
            {siteStats && (
              <div className="flex justify-center gap-6 mt-3">
                <div className="flex items-center gap-1.5 text-[#2E7D32]">
                  <CalendarCheck className="h-4 w-4" />
                  <span className="text-sm">今日 <span className="font-bold text-base">{siteStats.todayCheckins}</span> 人打卡</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#2E7D32]">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">累计 <span className="font-bold text-base">{siteStats.totalCheckins}</span> 次打卡</span>
                </div>
              </div>
            )}
          </div>

          <CardContent className="pt-5 space-y-5">
            {/* Student Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#2E7D32] font-medium">{t.college}</Label>
                <Input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder={t.college_placeholder}
                  className={inputClassName}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#2E7D32] font-medium">{t.class_name}</Label>
                <Input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder={t.class_name_placeholder}
                  className={inputClassName}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#2E7D32] font-medium">{t.name}</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.name_placeholder}
                  className={inputClassName}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#2E7D32] font-medium">{t.phone}</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.phone_placeholder}
                  className={inputClassName}
                />
                {checkInCount !== null && (
                  <p className="text-sm text-[#2E7D32] font-medium">
                    {t.your_checkin_count}：{checkInCount} 天
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#E8F5E9]" />

            {/* Photo */}
            <div>
              {cameraActive ? (
                <div className="space-y-3">
                  <div className="rounded-lg overflow-hidden border bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={capturePhoto}
                      disabled={!cameraReady}
                      className="flex-1 bg-[#2E7D32] hover:bg-[#81C784] text-white"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {t.capture}
                    </Button>
                    <Button variant="outline" onClick={stopCamera} className="border-[#81C784] text-[#2E7D32]">
                      {tc.cancel}
                    </Button>
                  </div>
                </div>
              ) : photoPreview ? (
                <div className="space-y-3">
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={photoPreview}
                      alt={t.photo_preview}
                      className="w-full h-auto"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={resetPhoto}
                    className="w-full border-[#81C784] text-[#2E7D32]"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t.retake_photo}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={startCamera}
                    className="w-full h-24 text-base bg-[#FFE082] hover:bg-[#FFD54F] text-[#424242] font-semibold rounded-lg"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    {t.take_photo}
                  </Button>
                  {cameraError && (
                    <Alert variant="destructive">
                      <AlertDescription>{t.camera_error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[#E8F5E9]" />

            {/* Thoughts */}
            <div className="space-y-2">
              <Label className="text-[#2E7D32] font-medium">{t.thoughts}</Label>
              <Textarea
                value={thoughts}
                onChange={(e) => setThoughts(e.target.value)}
                placeholder={t.thoughts_placeholder}
                rows={3}
                className={"min-h-[100px] resize-vertical " + inputClassName}
              />
              <p className="text-xs text-[#66BB6A]">{t.thoughts_hint}</p>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              size="lg"
              className="w-full text-base h-12 rounded-xl bg-[#2E7D32] hover:bg-[#388E3C] text-white font-semibold"
            >
              {submitting ? t.submitting : t.submit_checkin}
            </Button>
          </CardContent>
        </Card>

        <div className="h-6" />
      </main>
    </div>
  );
}
