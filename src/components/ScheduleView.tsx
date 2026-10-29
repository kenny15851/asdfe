import React, { useState } from 'react';
import { Calendar, Clock, Play, Sparkles } from 'lucide-react';
import { ScheduleItem } from '../types.js';

interface ScheduleViewProps {
  scheduleData: Record<string, ScheduleItem[]> | null;
  isLoading: boolean;
  onSelectAnime: (slug: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  scheduleData,
  isLoading,
  onSelectAnime,
}) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayName = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const [selectedDay, setSelectedDay] = useState(todayName);

  const items = scheduleData?.[selectedDay] || [];

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-rose-500" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Estimated Broadcast Schedule
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Weekly anime release times in Japan Standard Time (JST)
          </p>
        </div>

        {/* Day Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {days.map((day) => {
            const isToday = day === todayName;
            const isSelected = day === selectedDay;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`relative rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span>{day.substring(0, 3)}</span>
                {isToday && (
                  <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-400 mt-3">Fetching broadcast schedule...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
          <Clock className="h-10 w-10 text-zinc-600 mb-2" />
          <p className="text-sm font-semibold text-zinc-300">No scheduled releases for {selectedDay}</p>
          <p className="text-xs text-zinc-500 mt-1">Check another day for upcoming broadcasts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onSelectAnime(item.slug)}
              className="group flex items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 hover:border-zinc-700 hover:bg-zinc-900 transition cursor-pointer"
            >
              {item.poster ? (
                <img
                  src={item.poster}
                  alt={item.title}
                  className="h-20 w-14 rounded-lg object-cover bg-zinc-950 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-20 w-14 items-center justify-center rounded-lg bg-zinc-800 shrink-0">
                  <Sparkles className="h-5 w-5 text-zinc-500" />
                </div>
              )}

              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">
                    <Clock className="h-3 w-3" />
                    {item.time}
                  </span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                    Ep {item.episode}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-rose-400 transition">
                  {item.title}
                </h4>

                <button className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-zinc-400 group-hover:text-rose-400 transition">
                  <Play className="h-3 w-3 fill-current" />
                  <span>View Details & Stream</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
