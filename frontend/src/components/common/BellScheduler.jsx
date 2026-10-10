import React, { useEffect, useState, useRef } from 'react';
import { getPeriods } from '../../features/timetable/api';
import dayjs from 'dayjs';

export const BellScheduler = () => {
  const [periods, setPeriods] = useState([]);
  const lastRungTime = useRef(null);

  const [currentTime, setCurrentTime] = useState(dayjs().format('HH:mm:ss'));

  useEffect(() => {
    const fetchPeriods = () => {
      getPeriods().then(res => {
        setPeriods(res.data?.data || res.data || []);
      }).catch(err => console.error("Failed to load periods for bell scheduler", err));
    };

    fetchPeriods();
    const interval = setInterval(fetchPeriods, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = dayjs();
      const currentTimeStr = now.format('HH:mm');
      setCurrentTime(now.format('HH:mm:ss'));

      if (!periods.length) return;

      // Prevent ringing multiple times in the same minute
      if (lastRungTime.current === currentTimeStr) return;

      periods.forEach(p => {
        if (p.isDismissalBell && (p.endTime === currentTimeStr || p.startTime === currentTimeStr)) {
          playBell(true, p.id);
          lastRungTime.current = currentTimeStr;
        } else if (p.isBellEnabled && (p.startTime === currentTimeStr || p.endTime === currentTimeStr)) {
          playBell(false, p.id);
          lastRungTime.current = currentTimeStr;
        }
      });
    }, 1000); // Check every 1 second

    return () => clearInterval(interval);
  }, [periods]);

  const playBell = (isDismissal, periodId) => {
    try {
      const defaultLoudBell = 'https://actions.google.com/sounds/v1/alarms/school_bell_ring.ogg';
      const defaultDismissal = 'https://actions.google.com/sounds/v1/alarms/school_bell_ring.ogg'; 
      
      const periodCustomDataUrl = periodId ? localStorage.getItem(`custom_bell_data_url_${periodId}`) : null;
      const globalCustomDataUrl = localStorage.getItem('custom_bell_data_url');
      const customDataUrl = periodCustomDataUrl || globalCustomDataUrl;

      let audioUrl = isDismissal 
        ? (customDataUrl || defaultDismissal) 
        : (customDataUrl || defaultLoudBell);
        
      const audio = new Audio(audioUrl);
      audio.volume = 1.0; 
      audio.play().catch(e => console.error("Audio playback blocked", e));
    } catch (error) {
      console.error("Error playing bell", error);
    }
  };

  return null;
};
