import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 select-none text-foreground bg-background rounded-md", className)}
      classNames={{
        root: "text-foreground [--rdp-accent-color:hsl(var(--primary))] [--rdp-accent-background-color:hsl(var(--primary)/0.15)]",
        months: "flex flex-col sm:flex-row gap-4 relative",
        month: "space-y-3",
        month_caption: "flex justify-center pt-1 relative items-center h-8",
        caption_label: "text-sm font-semibold capitalize text-foreground",
        nav: "flex items-center justify-between absolute inset-x-0 top-1 px-1 z-10 pointer-events-none",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-background p-0 opacity-70 hover:opacity-100 hover:bg-muted pointer-events-auto shadow-none"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-background p-0 opacity-70 hover:opacity-100 hover:bg-muted pointer-events-auto shadow-none"
        ),
        month_grid: "w-full border-collapse space-y-1 mt-2",
        weekdays: "flex w-full justify-between mb-1",
        weekday: "text-muted-foreground w-9 font-medium text-[0.8rem] text-center capitalize",
        week: "flex w-full mt-1 justify-between",
        day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal hover:bg-accent hover:text-accent-foreground rounded-md transition-colors text-foreground"
        ),
        selected: "!bg-primary !text-primary-foreground hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground rounded-md font-semibold shadow-sm",
        today: "bg-accent/60 text-accent-foreground font-bold border border-primary/30 rounded-md",
        outside: "text-muted-foreground/40 opacity-40 hover:opacity-70",
        disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed hover:bg-transparent pointer-events-none",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("h-4 w-4", chevronClass)} {...chevronProps} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
