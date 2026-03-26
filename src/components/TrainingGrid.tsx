import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WORKOUT_COLORS = {
  "Easy run": "#8B5CF6", // Purple
  "Interval Run": "#EF4444", // Red
  "Strength": "#EAB308", // Yellow
  "Long Run": "#10B981", // Green
};

// Deterministic dummy data generator based on date
const getWorkoutForDate = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay(); 
  const dayOfMonth = date.getDate();
  
  const isRestWeek = dayOfMonth > 21 && dayOfMonth < 28;

  if (dayOfWeek === 1 || dayOfWeek === 5) {
    return { type: "Easy run", details: ["7km • 6:41 per km"] };
  } else if (dayOfWeek === 2) {
    return { type: "Interval Run", details: ["Warm up: 2km", "Interval: 10 x 400", "Pace: 4:45 - 4:50", "Cool Down: 2km"] };
  } else if (dayOfWeek === 3 && !isRestWeek) {
    return { type: "Strength", details: ["Dumbell Squat", "Romanian Deadlift", "Bench Press"] };
  } else if (dayOfWeek === 6) {
    const distance = isRestWeek ? 10 : 15 + (dayOfMonth % 10);
    return { type: "Long Run", details: [`${distance}km • 6:10 per km`] };
  }
  return null;
};

export function TrainingGrid() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // March 2026
  const [view, setView] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');

  const next = () => {
    const newDate = new Date(currentDate);
    if (view === 'Month') newDate.setMonth(newDate.getMonth() + 1);
    else if (view === 'Week') newDate.setDate(newDate.getDate() + 7);
    else if (view === 'Day') newDate.setDate(newDate.getDate() + 1);
    else if (view === 'Year') newDate.setFullYear(newDate.getFullYear() + 1);
    setCurrentDate(newDate);
  };

  const prev = () => {
    const newDate = new Date(currentDate);
    if (view === 'Month') newDate.setMonth(newDate.getMonth() - 1);
    else if (view === 'Week') newDate.setDate(newDate.getDate() - 7);
    else if (view === 'Day') newDate.setDate(newDate.getDate() - 1);
    else if (view === 'Year') newDate.setFullYear(newDate.getFullYear() - 1);
    setCurrentDate(newDate);
  };

  const formatDateDisplay = () => {
    if (view === 'Month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (view === 'Week') {
      const mon = new Date(currentDate);
      const day = mon.getDay();
      const diff = mon.getDate() - day + (day === 0 ? -6 : 1);
      mon.setDate(diff);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return `${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (view === 'Day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } else if (view === 'Year') {
      return currentDate.getFullYear().toString();
    }
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; // Mon = 0

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    while (days.length % 7 !== 0) days.push(null);

    const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    return (
      <div className="h-full flex flex-col min-h-[600px]">
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-xs font-semibold text-gray-500 tracking-wider text-center">{d}</div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 gap-px bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg overflow-hidden">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="bg-[#181818] min-h-[120px]" />;
            
            const workout = getWorkoutForDate(year, month, day);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <div key={`${year}-${month}-${day}`} className="bg-[#181818] min-h-[120px] p-2 flex flex-col group hover:bg-[#1E1E1E] transition-colors cursor-pointer" onClick={() => {
                setCurrentDate(new Date(year, month, day));
                setView('Day');
              }}>
                <span className={`text-sm font-medium mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#3B82F6] text-white' : 'text-gray-400'}`}>
                  {day}
                </span>
                {workout && (
                  <div className="flex-1 rounded-md p-2 border-l-4 bg-[#121212] flex flex-col gap-1" style={{ borderLeftColor: WORKOUT_COLORS[workout.type as keyof typeof WORKOUT_COLORS] }}>
                    <span className="text-xs font-bold text-gray-200">{workout.type}</span>
                    <span className="text-[10px] text-gray-400 line-clamp-2 leading-tight">{workout.details.join(', ')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const mon = new Date(currentDate);
    const day = mon.getDay();
    const diff = mon.getDate() - day + (day === 0 ? -6 : 1);
    mon.setDate(diff);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      weekDays.push(d);
    }

    return (
      <div className="h-full flex flex-col min-h-[600px]">
        <div className="flex-1 grid grid-cols-7 gap-4">
          {weekDays.map((date) => {
            const workout = getWorkoutForDate(date.getFullYear(), date.getMonth(), date.getDate());
            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const isToday = date.getDate() === new Date().getDate() && date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();

            return (
              <div key={date.toISOString()} className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-4 flex flex-col cursor-pointer hover:border-gray-500 transition-colors" onClick={() => {
                setCurrentDate(date);
                setView('Day');
              }}>
                <div className="text-center mb-6 pb-4 border-b border-[#2A2A2A]">
                  <div className="text-xs font-semibold text-gray-500 tracking-wider mb-2">{dayNames[date.getDay()]}</div>
                  <div className={`text-2xl font-bold mx-auto w-10 h-10 flex items-center justify-center rounded-full ${isToday ? 'bg-[#3B82F6] text-white' : 'text-gray-200'}`}>
                    {date.getDate()}
                  </div>
                </div>
                
                {workout ? (
                  <div className="flex-1 rounded-lg p-4 border-t-4 bg-[#121212] flex flex-col gap-3" style={{ borderTopColor: WORKOUT_COLORS[workout.type as keyof typeof WORKOUT_COLORS] }}>
                    <span className="text-sm font-bold text-gray-200 uppercase tracking-wider">{workout.type}</span>
                    <div className="flex flex-col gap-2">
                      {workout.details.map((detail, i) => (
                        <span key={i} className="text-xs text-gray-400 bg-[#1E1E1E] px-2 py-1.5 rounded">{detail}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-600 font-medium bg-[#121212] rounded-lg border border-[#2A2A2A] border-dashed">
                    Rest Day
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const workout = getWorkoutForDate(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    return (
      <div className="h-full flex items-start justify-center pt-10">
        <div className="w-full max-w-2xl bg-[#181818] border border-[#2A2A2A] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
          
          {workout ? (
            <div className="rounded-xl p-8 border-l-4 bg-[#121212]" style={{ borderLeftColor: WORKOUT_COLORS[workout.type as keyof typeof WORKOUT_COLORS] }}>
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#2A2A2A]">
                <h3 className="text-3xl font-bold text-gray-200">{workout.type}</h3>
                <span className="px-4 py-1.5 bg-[#1E1E1E] text-gray-300 rounded-full text-sm font-medium border border-[#2A2A2A]">Scheduled</span>
              </div>
              
              <div className="space-y-4">
                {workout.details.map((detail, i) => (
                  <div key={i} className="flex items-center gap-4 text-gray-300 bg-[#1E1E1E] p-5 rounded-xl border border-[#2A2A2A]">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: WORKOUT_COLORS[workout.type as keyof typeof WORKOUT_COLORS] }} />
                    <span className="text-lg">{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-[#121212] rounded-xl border border-[#2A2A2A] border-dashed">
              <div className="w-20 h-20 rounded-full bg-[#1E1E1E] flex items-center justify-center mb-6 border border-[#2A2A2A]">
                <span className="text-4xl">☕</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-300">Rest Day</h3>
              <p className="text-gray-500 mt-2 text-lg">Take some time to recover and relax.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
      <div className="grid grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
        {months.map(month => {
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          let firstDay = new Date(year, month, 1).getDay();
          firstDay = firstDay === 0 ? 6 : firstDay - 1;

          const days = [];
          for (let i = 0; i < firstDay; i++) days.push(null);
          for (let i = 1; i <= daysInMonth; i++) days.push(i);

          return (
            <div key={month} className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-5 cursor-pointer hover:border-gray-500 transition-colors" onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setMonth(month);
              setCurrentDate(newDate);
              setView('Month');
            }}>
              <h3 className="text-sm font-bold text-gray-200 mb-4 uppercase tracking-wider">{monthNames[month]} {year}</h3>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;
                  const workout = getWorkoutForDate(year, month, day);
                  return (
                    <div 
                      key={`${year}-${month}-${day}`} 
                      className="aspect-square rounded-sm"
                      style={{ 
                        backgroundColor: workout ? WORKOUT_COLORS[workout.type as keyof typeof WORKOUT_COLORS] : '#2A2A2A', 
                        opacity: workout ? 0.9 : 0.3 
                      }}
                      title={workout ? `${day} ${monthNames[month]}: ${workout.type}` : `${day} ${monthNames[month]}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
        <h1 className="text-2xl font-bold text-white">Training Menu</h1>
        
        <div className="flex items-center gap-6">
          {/* View Selector */}
          <div className="flex bg-[#1E1E1E] rounded-md border border-[#2A2A2A] p-1">
            {(['Day', 'Week', 'Month', 'Year'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 text-sm rounded-sm transition-colors ${view === v ? 'bg-[#2A2A2A] text-white font-medium shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Date Navigator */}
          <div className="flex items-center bg-[#1E1E1E] rounded-md border border-[#2A2A2A] px-2 py-1.5">
            <button onClick={prev} className="p-1 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <span className="mx-2 text-sm text-gray-200 min-w-[160px] text-center font-semibold tracking-wide">
              {formatDateDisplay()}
            </span>
            <button onClick={next} className="p-1 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {/* Grid Area */}
      <div className="flex-1 overflow-auto p-6">
        {view === 'Month' && renderMonthView()}
        {view === 'Week' && renderWeekView()}
        {view === 'Day' && renderDayView()}
        {view === 'Year' && renderYearView()}
      </div>
    </div>
  );
}
