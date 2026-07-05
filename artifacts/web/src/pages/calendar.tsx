import { useGetEvents } from "@workspace/api-client-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Calendar() {
  const { data: events, isLoading } = useGetEvents();
  
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventColor = (type: string) => {
    switch(type) {
      case 'medication': return 'bg-secondary text-secondary-foreground border-secondary/20';
      case 'routine': return 'bg-muted/50 text-foreground border-border/50';
      default: return 'bg-primary text-primary-foreground border-primary/20'; // event
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-10 animate-in fade-in duration-700 slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif text-foreground">Schedule</h1>
          <p className="text-muted-foreground font-subheading text-base max-w-md">
            Your time, carefully arranged. {format(today, 'MMMM yyyy')}
          </p>
        </div>
      </header>

      {isLoading ? (
        <Skeleton className="h-[600px] w-full rounded-2xl bg-muted/30" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 bg-card/30 border border-border/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="grid grid-cols-7 gap-px mb-2 text-center text-xs font-subheading text-muted-foreground uppercase tracking-wider">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {daysInMonth.map((day, i) => {
                const dayEvents = events?.filter(e => isSameDay(new Date(e.startTime), day)) || [];
                
                return (
                  <div 
                    key={day.toISOString()} 
                    className={cn(
                      "min-h-24 p-2 border rounded-xl transition-colors",
                      isToday(day) ? "border-primary/50 bg-primary/5" : "border-border/50 bg-card/20 hover:bg-card/40",
                      i === 0 ? `col-start-${day.getDay() + 1}` : ""
                    )}
                  >
                    <div className={cn(
                      "text-sm font-serif mb-2 flex items-center justify-center w-6 h-6 rounded-full",
                      isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {format(day, 'd')}
                    </div>
                    
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <div 
                          key={event.id}
                          className={cn("text-[10px] px-1.5 py-0.5 rounded border truncate", getEventColor(event.type))}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground text-center">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-serif border-b border-border/50 pb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Upcoming
            </h2>
            
            <div className="space-y-4">
              {events?.slice(0, 5).map(event => (
                <div key={event.id} className="p-4 bg-card/40 border border-border/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("w-2 h-2 rounded-full", 
                      event.type === 'medication' ? 'bg-secondary' : 
                      event.type === 'routine' ? 'bg-muted-foreground' : 'bg-primary'
                    )} />
                    <h3 className="font-medium text-foreground">{event.title}</h3>
                  </div>
                  <div className="space-y-1 pl-4 border-l border-border/50 ml-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {format(new Date(event.startTime), 'MMM d, h:mm a')}
                    </p>
                    {event.description && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-1">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {events?.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-8">No upcoming events scheduled.</p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
