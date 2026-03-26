import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, MapPin } from "lucide-react";

const WORKOUT_COLORS = {
  "Easy run": "#8B5CF6", // Purple
  "Interval Run": "#EF4444", // Red
  "Strength": "#EAB308", // Yellow
  "Long Run": "#10B981", // Green
};

const runners = [
  {
    id: 1,
    name: "Samantha William",
    expanded: true,
    races: [
      { name: "Jakarta Running...", icon: "🏃" },
      { name: "Singapore Marathon", icon: "🌍" }
    ],
    schedule: {
      "MON, 02 MAR": { type: "Easy run", details: ["7km • 6:41 per km"] },
      "TUE, 03 MAR": { type: "Interval Run", details: ["Warm up: 2km", "Interval: 10 x 400", "Pace: 4:45 - 4:50", "Cool Down: 2km"] },
      "WED, 04 MAR": { type: "Strength", details: ["Dumbell Squat", "Romanian Deadlift", "Bench Press"], more: "See 20 more" },
      "THU, 05 MAR": null,
      "FRI, 06 MAR": { type: "Easy run", details: ["7km • 6:41 per km"] }
    }
  },
  {
    id: 2,
    name: "Alexander Smith",
    expanded: true,
    races: [
      { name: "Jakarta Running...", icon: "🏃" },
      { name: "Singapore Marathon", icon: "🌍" }
    ],
    schedule: {
      "MON, 02 MAR": null,
      "TUE, 03 MAR": { type: "Strength", details: ["Dumbell Squat", "Romanian Deadlift", "Bench Press"], more: "See 20 more" },
      "WED, 04 MAR": null,
      "THU, 05 MAR": { type: "Interval Run", details: ["Warm up: 2km", "Interval: 10 x 400", "Pace: 4:45 - 4:50", "Cool Down: 2km"] },
      "FRI, 06 MAR": { type: "Long Run", details: ["7km • 6:41 per km", "3km • 5:30 per km", "6km • 6:10 per km"] }
    }
  },
  {
    id: 3,
    name: "Jonathan Wise",
    expanded: false,
    races: [],
    schedule: {
      "MON, 02 MAR": { type: "Easy run", details: [] },
      "TUE, 03 MAR": { type: "Strength", details: [] },
      "WED, 04 MAR": { type: "Interval Run", details: [] },
      "THU, 05 MAR": null,
      "FRI, 06 MAR": { type: "Easy run", details: [] }
    }
  },
  {
    id: 4,
    name: "Karen Summer",
    expanded: false,
    races: [],
    schedule: {
      "MON, 02 MAR": { type: "Strength", details: [] },
      "TUE, 03 MAR": null,
      "WED, 04 MAR": null,
      "THU, 05 MAR": { type: "Interval Run", details: [] },
      "FRI, 06 MAR": { type: "Easy run", details: [] }
    }
  },
  {
    id: 5,
    name: "Angela Flower",
    expanded: true,
    races: [
      { name: "Jakarta Running...", icon: "🏃" },
      { name: "Singapore Marathon", icon: "🌍" }
    ],
    schedule: {
      "MON, 02 MAR": { type: "Easy run", details: ["7km • 6:41 per km"] },
      "TUE, 03 MAR": { type: "Interval Run", details: ["Warm up: 2km", "Interval: 10 x 400", "Pace: 4:45 - 4:50", "Cool Down: 2km"] },
      "WED, 04 MAR": { type: "Strength", details: ["Dumbell Squat", "Romanian Deadlift", "Bench Press"], more: "See 20 more" },
      "THU, 05 MAR": null,
      "FRI, 06 MAR": { type: "Easy run", details: ["7km • 6:41 per km"] }
    }
  },
  {
    id: 6,
    name: "Tony Rock",
    expanded: false,
    races: [],
    schedule: {
      "MON, 02 MAR": null,
      "TUE, 03 MAR": { type: "Easy run", details: [] },
      "WED, 04 MAR": { type: "Strength", details: [] },
      "THU, 05 MAR": { type: "Interval Run", details: [] },
      "FRI, 06 MAR": { type: "Easy run", details: [] }
    }
  },
  {
    id: 7,
    name: "Michael Smith",
    expanded: false,
    races: [],
    schedule: {
      "MON, 02 MAR": { type: "Easy run", details: [] },
      "TUE, 03 MAR": { type: "Strength", details: [] },
      "WED, 04 MAR": { type: "Interval Run", details: [] },
      "THU, 05 MAR": null,
      "FRI, 06 MAR": null
    }
  }
];

const days = ["MON, 02 MAR", "TUE, 03 MAR", "WED, 04 MAR", "THU, 05 MAR", "FRI, 06 MAR"];

export function TrainingGrid() {
  return (
    <div className="flex flex-col h-full bg-[#121212]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
        <h1 className="text-2xl font-bold text-white">Weekly Training Menu</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#1E1E1E] rounded-md border border-[#2A2A2A] px-3 py-1.5">
            <button className="text-gray-400 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
            <span className="mx-4 text-sm text-gray-300">Mon, 02 Mar - Sun, 08 Mar</span>
            <button className="text-gray-400 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
          </div>
          
          <button className="flex items-center gap-2 bg-[#1E1E1E] hover:bg-[#2A2A2A] text-gray-300 border border-[#2A2A2A] rounded-md px-4 py-1.5 text-sm transition-colors">
            <Plus className="w-4 h-4" />
            Add Runner
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[1000px]">
          {/* Grid Header */}
          <div className="grid grid-cols-[220px_repeat(5,1fr)] border-b border-[#2A2A2A] sticky top-0 bg-[#121212] z-10">
            <div className="p-4 flex items-center justify-between text-xs font-semibold text-gray-500 tracking-wider border-r border-[#2A2A2A]">
              RUNNERS
              <Search className="w-4 h-4" />
            </div>
            {days.map(day => (
              <div key={day} className="p-4 text-xs font-semibold text-gray-500 tracking-wider border-r border-[#2A2A2A] last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="flex flex-col">
            {runners.map((runner) => (
              <div key={runner.id} className="grid grid-cols-[220px_repeat(5,1fr)] border-b border-[#2A2A2A]">
                {/* Runner Cell */}
                <div className="p-4 border-r border-[#2A2A2A] bg-[#181818]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-gray-200">{runner.name}</span>
                    {runner.expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                  
                  {runner.expanded && runner.races.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-gray-500 mb-2">Upcoming races:</div>
                      <div className="space-y-2">
                        {runner.races.map((race, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="text-base">{race.icon}</span>
                            <span className="truncate">{race.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule Cells */}
                {days.map(day => {
                  const workout = runner.schedule[day as keyof typeof runner.schedule];
                  return (
                    <div key={day} className="border-r border-[#2A2A2A] last:border-r-0 relative bg-[#181818]">
                      {workout && (
                        <div className="absolute inset-0 p-4 flex flex-col">
                          {/* Top Color Bar */}
                          <div 
                            className="absolute top-0 left-0 right-0 h-1" 
                            style={{ backgroundColor: WORKOUT_COLORS[workout.type as keyof typeof WORKOUT_COLORS] }}
                          />
                          
                          <div className="flex items-center justify-between mb-3 mt-1">
                            <span className="font-medium text-gray-200 text-sm">{workout.type}</span>
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          </div>
                          
                          {runner.expanded && workout.details.length > 0 && (
                            <div className="flex-1 flex flex-col gap-1.5 text-sm text-gray-400">
                              {workout.details.map((detail, idx) => (
                                <div key={idx}>{detail}</div>
                              ))}
                              {workout.more && (
                                <div className="text-[#3B82F6] mt-1 cursor-pointer hover:underline">{workout.more}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
