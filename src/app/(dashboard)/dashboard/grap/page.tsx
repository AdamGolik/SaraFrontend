"use client";
import React, { useState, useEffect } from "react";
import {
  format,
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  parseISO,
  isSameDay,
  getHours,
  getMinutes,
  setHours,
  setMinutes,
} from "date-fns";
import { pl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  PlusCircle,
  Move,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { clients } from "@/lib/api";
import * as z from "zod";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// View types
type ViewType = "month" | "week" | "day";

// Appointment form schema
const appointmentSchema = z.object({
  name: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  lastname: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  telephone: z.string().min(9, "Nieprawidłowy numer telefonu"),
  title: z.string(),
  description: z.string().optional(),
  date: z.date(),
  startHour: z.string(),
  startMinute: z.string(),
  endHour: z.string(),
  endMinute: z.string(),
  datetime: z.date(),
  added_description: z
    .object({
      contact_preference: z.string().optional(),
      priority: z.string().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

interface Appointment {
  uuid: string;
  name: string;
  lastname: string;
  title: string;
  description?: string;
  telephone: string;
  time_from: string;
  time_to: string;
  datetime: string;
  added_description?: {
    contact_preference?: string;
    priority?: string;
    notes?: string;
    tags?: string[];
  };
}

const Scheduler: React.FC = () => {
  // State hooks
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("week");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [sidebarAppointments, setSidebarAppointments] = useState<Appointment[]>(
    [],
  );
  const [selectedDateForSidebar, setSelectedDateForSidebar] =
    useState<Date | null>(null);
  const [draggingAppointment, setDraggingAppointment] =
    useState<Appointment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<{
    hour: number;
    date: Date;
  } | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<
    string | null
  >(null);

  // Get hours for the time slots (8:00 - 20:00)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 → 20

  // Minutes for selection
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  // Form hook
  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      name: "",
      lastname: "",
      telephone: "",
      title: "",
      description: "",
      date: new Date(),
      startHour: "08",
      startMinute: "00",
      endHour: "09",
      endMinute: "00",
      datetime: new Date(),
      added_description: {
        contact_preference: "telephone",
        priority: "medium",
        notes: "",
        tags: [],
      },
    },
  });

  // Get appointments for the current view - with error handling
  const fetchAppointments = async (forceRefresh = false) => {
    if (isLoading && !forceRefresh) return;

    setIsLoading(true);

    try {
      let from: Date, to: Date;

      if (view === "month") {
        from = startOfMonth(currentDate);
        to = endOfMonth(currentDate);
      } else if (view === "week") {
        from = startOfWeek(currentDate, { weekStartsOn: 1 });
        to = addDays(from, 6);
      } else {
        // For day view, adjust the time range to account for timezone
        from = startOfDay(currentDate);
        to = endOfDay(currentDate);
      }

      // Add 2 hours to both from and to dates to ensure we get the correct range
      from.setHours(from.getHours() + 2);
      to.setHours(to.getHours() + 2);
      console.log("Full API URL:", `/clients?from=${from.toISOString()}&to=${to.toISOString()}&page=1&limit=100`);
      console.log("=== API Request Details ===");
      console.log("View type:", view);
      console.log("Current date:", currentDate.toISOString());
      console.log("Date range:", {
        from: from.toISOString(),
        to: to.toISOString(),
        fromFormatted: format(from, "yyyy-MM-dd HH:mm:ss"),
        toFormatted: format(to, "yyyy-MM-dd HH:mm:ss"),
      });
      console.log("API Parameters:", {
        from: from.toISOString(),
        to: to.toISOString(),
        page: 1,
        limit: 100
      });
      console.log("========================");

      // Fetch appointments from API
      const response = await clients.getByDateRange(
        from.toISOString(),
        to.toISOString(),
        1,
        100,
      );

      if (response && response.clients) {
        console.log("=== API Response Details ===");
        console.log("Number of appointments:", response.clients.length);
        console.log("Appointments dates:", response.clients.map((client: Appointment) => ({
          date: new Date(client.time_from).toDateString(),
          time: new Date(client.time_from).toTimeString(),
          title: client.title
        })));
        console.log("=========================");
        setAppointments(response.clients);
      } else {
        console.log("No appointments received");
        setAppointments([]);
      }

      // Update sidebar appointments if a date is selected
      if (selectedDateForSidebar) {
        updateSidebarAppointments(selectedDateForSidebar);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać harmonogramu",
        variant: "destructive",
      });
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if time slot is available
  const isTimeSlotAvailable = (
    date: Date,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
  ) => {
    const startTime = new Date(date);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);

    // Don't check against the current appointment when editing
    const appointmentsToCheck = editingAppointment
      ? appointments.filter((app) => app.uuid !== editingAppointment.uuid)
      : appointments;

    return !appointmentsToCheck.some((app) => {
      const appStart = new Date(app.time_from);
      const appEnd = new Date(app.time_to);

      // Check if the new appointment overlaps with any existing one
      return (
        (startTime >= appStart && startTime < appEnd) || // New start time falls within existing appointment
        (endTime > appStart && endTime <= appEnd) || // New end time falls within existing appointment
        (startTime <= appStart && endTime >= appEnd) // New appointment completely encompasses existing one
      );
    });
  };

  // Call fetchAppointments when view or date changes
  useEffect(() => {
    console.log("View or date changed:", {
      view,
      currentDate: currentDate.toISOString(),
    });
    fetchAppointments(true);
  }, [currentDate, view]);

  // Navigation functions
  const navigatePrevious = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const navigateNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Calculate the dates to show based on the selected view
  const getDatesToShow = () => {
    if (view === "month") {
      const firstDay = startOfMonth(currentDate);
      const start = startOfWeek(firstDay, { weekStartsOn: 1 });
      return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    } else if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else {
      // For day view, ensure we're using the correct date
      const day = new Date(currentDate);
      day.setHours(0, 0, 0, 0); // Reset time to start of day
      console.log("Day view date:", day.toISOString());
      return [day];
    }
  };

  const datesToShow = getDatesToShow();

  // Find appointments for a specific date and hour
  const getAppointmentsForDateAndHour = (date: Date, hour: number) => {
    const dateStr = format(date, "yyyy-MM-dd");

    return appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.time_from);
      return (
        format(appointmentDate, "yyyy-MM-dd") === dateStr &&
        appointmentDate.getHours() === hour
      );
    });
  };

  // Get all appointments for a specific date (for month view)
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");

    return appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.time_from);
      return format(appointmentDate, "yyyy-MM-dd") === dateStr;
    });
  };

  // Update sidebar appointments for a specific date
  const updateSidebarAppointments = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");

    const filteredAppointments = appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.time_from);
      return format(appointmentDate, "yyyy-MM-dd") === dateStr;
    });

    // Sort appointments by time
    filteredAppointments.sort((a, b) => {
      return new Date(a.time_from).getTime() - new Date(b.time_from).getTime();
    });

    setSidebarAppointments(filteredAppointments);
    setShowTimeline(true);
  };

  // Handle cell click to open appointment form
  const handleCellClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedDateForSidebar(date);
    updateSidebarAppointments(date);

    // Format hour with leading zero if needed
    const hourStr = hour.toString().padStart(2, "0");
    setSelectedTime(`${hourStr}:00`);

    // Reset form with correct time values and the selected date
    form.reset({
      name: "",
      lastname: "",
      telephone: "",
      title: "",
      description: "",
      date: date, // Use the selected date instead of new Date()
      startHour: hourStr,
      startMinute: "00",
      endHour: (hour + 1).toString().padStart(2, "0"),
      endMinute: "00",
      datetime: date, // Use the selected date here too
      added_description: {
        contact_preference: "telephone",
        priority: "medium",
        notes: "",
        tags: [],
      },
    });

    setEditingAppointment(null);
    setShowAdditionalFields(false);
    setIsModalOpen(true);
  };

  // Handle day click in month view
  const handleDayClick = (date: Date) => {
    setSelectedDateForSidebar(date);
    updateSidebarAppointments(date);
    setShowSheet(true);
  };

  // Handle appointment click to edit
  const handleAppointmentClick = (
    appointment: Appointment,
    event?: React.MouseEvent | any,
  ) => {
    if (event?.stopPropagation) {
      event.stopPropagation();
    }

    // Get exact times and date from the appointment strings
    const timeFromDate = new Date(appointment.time_from);
    const timeToDate = new Date(appointment.time_to);

    // Set selectedDate for context (optional, form state is primary)
    setSelectedDate(timeFromDate);
    setSelectedTime(
      `${timeFromDate.getHours().toString().padStart(2, "0")}:${timeFromDate.getMinutes().toString().padStart(2, "0")}`,
    );

    // Reset form with appointment data, using the new schema structure
    form.reset({
      name: appointment.name,
      lastname: appointment.lastname,
      telephone: appointment.telephone,
      title: appointment.title,
      description: appointment.description || "",
      date: timeFromDate,
      startHour: timeFromDate.getHours().toString().padStart(2, "0"),
      startMinute: timeFromDate.getMinutes().toString().padStart(2, "0"),
      endHour: timeToDate.getHours().toString().padStart(2, "0"),
      endMinute: timeToDate.getMinutes().toString().padStart(2, "0"),
      datetime: new Date(appointment.datetime),
      added_description: appointment.added_description || {
        contact_preference: "telephone",
        priority: "medium",
        notes: "",
        tags: [],
      },
    });

    setEditingAppointment(appointment);
    setShowAdditionalFields(false);
    setIsModalOpen(true);
  };

  // Mouse events for drag and drop in month view
  const handleMonthDayMouseDown = (
    date: Date,
    event: React.MouseEvent,
    appointment: Appointment,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingAppointment(appointment);
    setIsDragging(true);
    setDragStartPos({ x: event.clientX, y: event.clientY });
  };

  const handleMonthDayMouseUp = async (date: Date, event: React.MouseEvent) => {
    event.preventDefault();

    if (draggingAppointment && isDragging) {
      try {
        const timeFrom = new Date(draggingAppointment.time_from);
        const timeTo = new Date(draggingAppointment.time_to);

        // Keep the same time, just change the date
        const newTimeFrom = new Date(date);
        newTimeFrom.setHours(timeFrom.getHours(), timeFrom.getMinutes(), 0, 0);

        const duration = timeTo.getTime() - timeFrom.getTime();
        const newTimeTo = new Date(newTimeFrom.getTime() + duration);

        // Update appointment
        const updatedAppointment = {
          ...draggingAppointment,
          time_from: newTimeFrom.toISOString().split(".")[0],
          time_to: newTimeTo.toISOString().split(".")[0],
        };

        await clients.update(draggingAppointment.uuid, updatedAppointment);

        toast({
          title: "Sukces",
          description: "Termin został przeniesiony",
        });

        // Refresh appointments
        fetchAppointments(true);
      } catch (error) {
        console.error("Failed to move appointment:", error);
        toast({
          title: "Błąd",
          description: "Nie udało się przenieść terminu",
          variant: "destructive",
        });
      }
    }

    // Reset drag state
    setDraggingAppointment(null);
    setIsDragging(false);
    setDragStartPos(null);
  };

  const handleMonthDayMouseMove = (event: React.MouseEvent) => {
    if (isDragging && dragStartPos) {
      // Calculate the distance moved
      const deltaX = Math.abs(event.clientX - dragStartPos.x);
      const deltaY = Math.abs(event.clientY - dragStartPos.y);

      // Only proceed if we've moved a significant distance (to prevent accidental drags)
      if (deltaX > 10 || deltaY > 10) {
        // The drag is in progress, handled by mouseup event
      }
    }
  };

  // Drag and drop functionality for week/day view
  const handleDragStart = (
    appointment: Appointment,
    event: React.DragEvent,
  ) => {
    event.stopPropagation();
    setDraggingAppointment(appointment);
    setIsDragging(true);

    // Set data on the drag event (needed for HTML5 drag and drop)
    event.dataTransfer.setData("text/plain", appointment.uuid);

    // Make the drag image semi-transparent
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragOver = (date: Date, hour: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget({ date, hour });

    // Set drop effect
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (date: Date, hour: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const uuid = e.dataTransfer.getData("text/plain");

    // Find the appointment by UUID
    const appointment = appointments.find((app) => app.uuid === uuid);

    if (!appointment) return;

    try {
      const timeFrom = new Date(appointment.time_from);
      const timeTo = new Date(appointment.time_to);

      // Calculate original duration
      const durationMs = timeTo.getTime() - timeFrom.getTime();

      // Get original minutes
      const fromMinutes = timeFrom.getMinutes();

      // Set new start time: dropped hour + 2h, preserving original minutes
      const newTimeFrom = new Date(date);
      newTimeFrom.setHours(hour + 2, fromMinutes, 0, 0);

      // Set new end time using original duration
      const newTimeTo = new Date(newTimeFrom.getTime() + durationMs);

      // Prepare updated appointment data
      const updatedAppointmentData = {
        ...appointment,
        time_from: newTimeFrom.toISOString().split(".")[0],
        time_to: newTimeTo.toISOString().split(".")[0],
      };

      await clients.update(appointment.uuid, updatedAppointmentData);

      toast({
        title: "Sukces",
        description: "Termin został przeniesiony",
      });

      fetchAppointments(true);
    } catch (error) {
      console.error("Failed to reschedule appointment:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się przenieść terminu",
        variant: "destructive",
      });
    } finally {
      setDraggingAppointment(null);
      setIsDragging(false);
      setDragTarget(null);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "";
    }

    setDraggingAppointment(null);
    setIsDragging(false);
    setDragTarget(null);
  };

  // Submit appointment form
  const onSubmit = async (data: z.infer<typeof appointmentSchema>) => {
    if (!selectedDate) return;

    try {
      setIsLoading(true);

      // Create time_from and time_to Date objects from form values
      const timeFrom = new Date(data.date);
      timeFrom.setHours(
        parseInt(data.startHour) + 2, // Add 2 hours
        parseInt(data.startMinute),
        0,
        0,
      );

      const timeTo = new Date(data.date);
      timeTo.setHours(
        parseInt(data.endHour) + 2, // Add 2 hours
        parseInt(data.endMinute),
        0,
        0,
      );

      // Check if the time slot is available
      if (
        !isTimeSlotAvailable(
          data.date,
          parseInt(data.startHour) + 2, // Add 2 hours for checking
          parseInt(data.startMinute),
          parseInt(data.endHour) + 2, // Add 2 hours for checking
          parseInt(data.endMinute),
        )
      ) {
        toast({
          title: "Błąd",
          description: "Wybrany termin koliduje z istniejącym spotkaniem",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Prepare appointment data for API
      const appointmentData = {
        name: data.name,
        lastname: data.lastname,
        telephone: data.telephone,
        title: data.title,
        description: data.description || "",
        time_from: timeFrom.toISOString().split(".")[0],
        time_to: timeTo.toISOString().split(".")[0],
        datetime: timeFrom.toISOString().split(".")[0],
        added_description: {
          contact_preference:
            data.added_description?.contact_preference || "telephone",
          priority: data.added_description?.priority || "medium",
          notes: data.added_description?.notes || "",
          tags: data.added_description?.tags || [],
        },
      };

      if (editingAppointment) {
        await clients.update(editingAppointment.uuid, appointmentData);
        toast({
          title: "Sukces",
          description: "Termin został zaktualizowany",
        });
      } else {
        await clients.create(appointmentData);
        toast({
          title: "Sukces",
          description: "Termin został zarezerwowany",
        });
      }

      setIsModalOpen(false);
      form.reset();
      fetchAppointments(true);

      if (selectedDateForSidebar) {
        updateSidebarAppointments(selectedDateForSidebar);
      }
    } catch (error: any) {
      console.error("Failed to save appointment:", error);
      if (error.response?.status === 409) {
        toast({
          title: "Błąd",
          description: "Wybrana godzina jest już zajęta. Wybierz inną godzinę.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Błąd",
          description: "Wystąpił problem podczas zapisywania terminu",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete appointment
  const handleDeleteAppointment = async () => {
    if (!editingAppointment) return;

    try {
      setIsLoading(true);
      await clients.delete(editingAppointment.uuid);
      toast({
        title: "Sukces",
        description: "Termin został usunięty",
      });

      // Close modal and refresh appointments
      setIsModalOpen(false);
      form.reset();

      // Refresh appointments
      fetchAppointments(true);

      // Update sidebar if needed
      if (selectedDateForSidebar) {
        updateSidebarAppointments(selectedDateForSidebar);
      }
    } catch (error) {
      console.error("Failed to delete appointment:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć terminu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get header title based on view
  const getHeaderTitle = () => {
    if (view === "month") {
      return format(currentDate, "LLLL yyyy", { locale: pl });
    } else if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      return `${format(start, "d MMMM", { locale: pl })} - ${format(end, "d MMMM yyyy", { locale: pl })}`;
    } else {
      return format(currentDate, "EEEE, d MMMM yyyy", { locale: pl });
    }
  };

  // Go to specific date/week
  const goToDateView = (date: Date) => {
    setCurrentDate(date);
    setView("week");
  };

  const formatAppointmentTime = (appointment: Appointment) => {
    const timeFrom = new Date(appointment.time_from);
    const timeTo = new Date(appointment.time_to);

    // Dodajemy 2 godziny
    timeFrom.setHours(timeFrom.getHours() + 2);
    timeTo.setHours(timeTo.getHours() + 2);

    return `${timeFrom.getHours().toString().padStart(2, "0")}:${timeFrom.getMinutes().toString().padStart(2, "0")} - ${timeTo.getHours().toString().padStart(2, "0")}:${timeTo.getMinutes().toString().padStart(2, "0")}`;
  };

  // Add new appointment from sidebar
  const handleAddFromSidebar = () => {
    if (!selectedDateForSidebar) return;

    setSelectedDate(selectedDateForSidebar);

    // Default to 9:00 AM for new appointments
    const defaultHourStr = "09";

    form.reset({
      name: "",
      lastname: "",
      telephone: "",
      title: "",
      description: "",
      date: new Date(),
      startHour: defaultHourStr,
      startMinute: "00",
      endHour: (parseInt(defaultHourStr) + 1).toString().padStart(2, "0"), // Default end time is 1 hour later
      endMinute: "00",
      datetime: new Date(),
      added_description: {
        contact_preference: "telephone",
        priority: "medium",
        notes: "",
        tags: [],
      },
    });

    setEditingAppointment(null);
    setShowAdditionalFields(false);
    setIsModalOpen(true);
  };

  // Calculate timeline positions for appointments
  const getTimelineStyles = (appointment: Appointment) => {
    const timeFrom = new Date(appointment.time_from);
    const timeTo = new Date(appointment.time_to);

    const startHour = timeFrom.getHours();
    const startMinute = timeFrom.getMinutes();
    const endHour = timeTo.getHours();
    const endMinute = timeTo.getMinutes();

    // Starting position is based on hours since 8:00 AM (first time slot)
    const startPosition = (startHour - 4) * 60 + startMinute;
    const duration = (endHour - startHour) * 60 + (endMinute - startMinute);

    return {
      top: `${startPosition}px`,
      height: `${duration}px`,
    };
  };

  // Helper: check if any appointment in an hour has minutes (not 0)
  const hasMinuteAppointments = (date: Date, hour: number) => {
    return getAppointmentsForDateAndHour(date, hour).some((app) => {
      const start = new Date(app.time_from);
      const end = new Date(app.time_to);
      return start.getMinutes() !== 0 || end.getMinutes() !== 0;
    });
  };

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return "bg-blue-500/80";
    if (priority === "high") return "bg-red-500/80";
    if (priority === "low") return "bg-green-500/80";
    return "bg-blue-500/80"; // medium or default
  };

  // Add long press support for month view day cells
  const LONG_PRESS_DURATION = 400; // ms

  // In appointment tile (day/week view):
  const handleAppointmentClickMobile = (
    appointment: Appointment,
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    if (window.innerWidth < 640) {
      // mobile: expand details
      setExpandedAppointmentId(
        appointment.uuid === expandedAppointmentId ? null : appointment.uuid,
      );
    } else {
      handleAppointmentClick(appointment, e);
    }
  };

  // In month view cell:
  let pressTimer: NodeJS.Timeout | null = null;
  let tapCount = 0;
  const handleMobileDayTouchStart = (date: Date) => (e: React.TouchEvent) => {
    if (window.innerWidth < 640) {
      tapCount++;
      if (tapCount === 1) {
        pressTimer = setTimeout(() => {
          goToDateView(date); // long press: go to week
          tapCount = 0;
        }, LONG_PRESS_DURATION);
      } else if (tapCount === 2) {
        if (pressTimer) clearTimeout(pressTimer);
        handleDayClick(date); // double long press: open panel
        tapCount = 0;
      }
    }
  };
  const handleMobileDayTouchEnd = () => (e: React.TouchEvent) => {
    if (window.innerWidth < 640 && pressTimer) {
      clearTimeout(pressTimer);
    }
  };

  return (
    <div className="container mx-auto px-0 sm:px-2 md:px-4 py-2 md:py-6 bg-black text-white min-h-screen w-full overflow-x-hidden rounded-none sm:rounded-xl shadow-none sm:shadow-lg">
      {/* Booksy-style header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-2 md:py-4 mb-2 px-2 sm:px-4 bg-black sm:bg-transparent sticky top-0 z-30 rounded-b-xl sm:rounded-none shadow-md sm:shadow-none">
        <div className="flex items-center gap-2 justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={navigatePrevious}
            className="rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <span className="text-lg sm:text-xl md:text-2xl font-bold text-center min-w-[90px] sm:min-w-[120px]">
            {format(currentDate, "LLLL yyyy", { locale: pl })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={navigateNext}
            className="rounded-full"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
        <div className="flex gap-1 sm:gap-2 mt-2 md:mt-0 justify-center">
          <Button
            variant={view === "day" ? "default" : "outline"}
            onClick={() => setView("day")}
            className={`w-full sm:w-auto text-base sm:text-sm py-3 sm:py-2 rounded-xl sm:rounded-lg ${view === "day" ? "bg-white text-black" : ""}`}
          >
            Dzień
          </Button>
          <Button
            variant={view === "week" ? "default" : "outline"}
            onClick={() => setView("week")}
            className={`w-full sm:w-auto text-base sm:text-sm py-3 sm:py-2 rounded-xl sm:rounded-lg ${view === "week" ? "bg-white text-black" : ""}`}
          >
            Tydzień
          </Button>
          <Button
            variant={view === "month" ? "default" : "outline"}
            onClick={() => setView("month")}
            className={`w-full sm:w-auto text-base sm:text-sm py-3 sm:py-2 rounded-xl sm:rounded-lg ${view === "month" ? "bg-white text-black" : ""}`}
          >
            Miesiąc
          </Button>
        </div>
      </div>
      <div className="flex gap-2 mb-4 sm:hidden">
        <Button
          className={`flex-1 py-3 rounded-xl text-lg ${view === "day" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setView("day")}
          variant={view === "day" ? "default" : "outline"}
        >
          Dzień
        </Button>
        <Button
          className={`flex-1 py-3 rounded-xl text-lg ${view === "week" ? "bg-white text-black" : "bg-gray-800 text-white"}`}
          onClick={() => setView("week")}
          variant={view === "week" ? "default" : "outline"}
        >
          Tydzień
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:gap-6 w-full">
        {/* Main Calendar */}
        <div className="col-span-1 w-full">
          <Card className="border-none shadow-none bg-black text-white w-full">
            <CardContent className="px-0 pb-0 w-full">
              <div className="flex overflow-x-auto border border-white rounded-lg bg-black w-full">
                {/* Time column - only shown for week and day views */}
                {(view === "week" || view === "day") && (
                  <div className="w-16 sm:w-16 md:w-20 flex-shrink-0 border-r border-gray-700 bg-black">
                    <div className="h-10 sm:h-12"></div>{" "}
                    {/* Empty cell for header alignment */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="h-28 sm:h-20 flex flex-col items-center justify-center border-t border-gray-700 relative"
                      >
                        <span className="text-xs sm:text-sm font-medium text-gray-300">{`${hour}:00`}</span>
                        {/* Minute lines only if needed */}
                        {datesToShow.some((date) =>
                          hasMinuteAppointments(date, hour),
                        ) && (
                          <div className="absolute left-0 right-0 h-full">
                            {[15, 30, 45].map((minute) => (
                              <div
                                key={minute}
                                className="absolute left-0 right-0 h-px bg-blue-400/60"
                                style={{
                                  top: `calc(${(minute / 60) * 112}px)`,
                                }} // 112px for h-28
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex-grow overflow-x-auto w-full">
                  {/* Grid Header */}
                  <div className="flex min-w-[600px] sm:min-w-full text-base sm:text-sm">
                    {view === "month"
                      ? ["Pon", "Wt", "Śr", "Czw", "Pt", "Sb", "Nd"].map(
                          (day, i) => (
                            <div
                              key={i}
                              className="flex-1 h-10 sm:h-12 flex items-center justify-center border-b border-gray-700 bg-black min-w-[60px] sm:min-w-[90px] md:min-w-[120px]"
                            >
                              <span className="text-xs sm:text-sm font-medium text-gray-300">
                                {day}
                              </span>
                            </div>
                          ),
                        )
                      : datesToShow.map((date, i) => {
                          let pressTimer: NodeJS.Timeout | null = null;
                          const handleMobileDayTouchStart = (
                            e: React.TouchEvent,
                          ) => {
                            if (window.innerWidth < 640) {
                              tapCount++;
                              if (tapCount === 1) {
                                pressTimer = setTimeout(() => {
                                  goToDateView(date); // long press: go to week
                                  tapCount = 0;
                                }, LONG_PRESS_DURATION);
                              } else if (tapCount === 2) {
                                if (pressTimer) clearTimeout(pressTimer);
                                handleDayClick(date); // double long press: open panel
                                tapCount = 0;
                              }
                            }
                          };
                          const handleMobileDayTouchEnd = (
                            e: React.TouchEvent,
                          ) => {
                            if (window.innerWidth < 640 && pressTimer) {
                              clearTimeout(pressTimer);
                            }
                          };
                          return (
                            <div
                              key={i}
                              className={`flex-1 h-10 sm:h-12 flex flex-col items-center justify-center border-b ${
                                format(date, "yyyy-MM-dd") ===
                                format(new Date(), "yyyy-MM-dd")
                                  ? "bg-blue-900/30"
                                  : "bg-black"
                              } border-gray-700 min-w-[60px] sm:min-w-[90px] md:min-w-[120px]`}
                            >
                              <span className="text-[10px] sm:text-xs text-gray-400">
                                {format(date, "EEE", { locale: pl })}
                              </span>
                              <span className="text-xs sm:text-sm font-medium">
                                {format(date, "d")}
                              </span>
                            </div>
                          );
                        })}
                  </div>
                  {/* Grid Content */}
                  {view === "month" ? (
                    // Month view grid
                    <div className="grid grid-cols-7 auto-rows-fr min-w-[600px] sm:min-w-full">
                      {datesToShow.map((date, i) => {
                        const isCurrentMonth =
                          date.getMonth() === currentDate.getMonth();
                        const isToday =
                          format(date, "yyyy-MM-dd") ===
                          format(new Date(), "yyyy-MM-dd");
                        const dateAppointments = getAppointmentsForDate(date);
                        let pressTimer: NodeJS.Timeout | null = null;
                        let tapCount = 0;
                        // Handlers for long press
                        const handlePointerDown = (e: React.PointerEvent) => {
                          pressTimer = setTimeout(() => {
                            handleDayClick(date);
                          }, LONG_PRESS_DURATION);
                        };
                        const handlePointerUp = (e: React.PointerEvent) => {
                          if (pressTimer) clearTimeout(pressTimer);
                        };
                        const handlePointerLeave = (e: React.PointerEvent) => {
                          if (pressTimer) clearTimeout(pressTimer);
                        };
                        const handleTouchStart = (e: React.TouchEvent) => {
                          pressTimer = setTimeout(() => {
                            handleDayClick(date);
                          }, LONG_PRESS_DURATION);
                        };
                        const handleTouchEnd = (e: React.TouchEvent) => {
                          if (pressTimer) clearTimeout(pressTimer);
                        };
                        const handleTouchCancel = (e: React.TouchEvent) => {
                          if (pressTimer) clearTimeout(pressTimer);
                        };
                        return (
                          <div
                            key={i}
                            className={`h-36 sm:h-28 p-3 sm:p-1 border-t border-l ${i % 7 === 6 ? "border-r" : ""} ${isToday ? "bg-blue-900/20" : "bg-black"} ${!isCurrentMonth ? "text-gray-500" : "text-gray-200"} border-gray-700 min-w-[120px] rounded-xl sm:rounded-none transition-colors duration-200 ease-in-out cursor-pointer hover:bg-blue-900/30`}
                            onClick={() => goToDateView(date)}
                            onPointerDown={handlePointerDown}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            onTouchStart={handleMobileDayTouchStart(date)}
                            onTouchEnd={handleMobileDayTouchEnd()}
                            onTouchCancel={handleTouchCancel}
                            style={{ touchAction: "manipulation" }}
                          >
                            <div className="text-right mb-1">
                              <span className="text-xs font-medium">
                                {format(date, "d")}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {dateAppointments.slice(0, 2).map((app, idx) => {
                                const priority =
                                  app.added_description?.priority || "medium";
                                const colorClass = getPriorityColor(priority);
                                return (
                                  <div
                                    key={idx}
                                    className={`${colorClass} rounded-xl px-3 py-2 text-base truncate cursor-pointer shadow-md mb-1`}
                                    title={`${app.title} - ${app.name} ${app.lastname}`}
                                    onClick={(e) => {
                                      if (window.innerWidth < 640) {
                                        // mobile: expand details
                                        setExpandedAppointmentId(
                                          app.uuid === expandedAppointmentId
                                            ? null
                                            : app.uuid,
                                        );
                                      } else {
                                        handleAppointmentClick(app, e);
                                      }
                                    }}
                                    onTouchStart={(e) => {
                                      if (window.innerWidth < 640) {
                                        pressTimer = setTimeout(() => {
                                          handleAppointmentClick(app, e);
                                        }, LONG_PRESS_DURATION);
                                      }
                                    }}
                                    onTouchEnd={(e) => {
                                      if (
                                        window.innerWidth < 640 &&
                                        pressTimer
                                      ) {
                                        clearTimeout(pressTimer);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center">
                                      <span>
                                        {format(
                                          new Date(app.time_from),
                                          "HH:mm",
                                        )}{" "}
                                        {app.title}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              {dateAppointments.length > 2 && (
                                <div className="text-xs text-gray-400 group-hover:opacity-100 opacity-0 transition-opacity">
                                  +{dateAppointments.length - 2} więcej
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Week and day view grid
                    <div className="relative min-w-[600px] sm:min-w-full">
                      <div className="flex">
                        {datesToShow.map((date, dateIndex) => (
                          <div
                            key={dateIndex}
                            className="flex-1 min-w-[60px] sm:min-w-[90px] md:min-w-[120px]"
                          >
                            {hours.map((hour) => {
                              const cellAppointments =
                                getAppointmentsForDateAndHour(date, hour);
                              const showMinuteLines = hasMinuteAppointments(
                                date,
                                hour,
                              );
                              return (
                                <div
                                  key={`${dateIndex}-${hour}`}
                                  className={`h-32 sm:h-20 border-t border-l border-gray-700 relative group bg-black hover:bg-gray-900 ${dragTarget && dragTarget.hour === hour && isSameDay(dragTarget.date, date) ? "bg-blue-900/20" : ""} px-3 sm:px-0 rounded-xl sm:rounded-none transition-colors duration-200 ease-in-out`}
                                  onClick={() => handleCellClick(date, hour)}
                                  onDragOver={(e) =>
                                    handleDragOver(date, hour, e)
                                  }
                                  onDrop={(e) => handleDrop(date, hour, e)}
                                >
                                  {/* Minute lines only if needed */}
                                  {showMinuteLines && (
                                    <div className="absolute inset-0">
                                      {[15, 30, 45].map((minute) => (
                                        <div
                                          key={minute}
                                          className="absolute left-0 right-0 h-px bg-blue-400/60"
                                          style={{
                                            top: `calc(${(minute / 60) * 112}px)`,
                                          }} // 112px for h-28
                                        />
                                      ))}
                                    </div>
                                  )}
                                  {cellAppointments.map((app, idx) => {
                                    const startTime = new Date(app.time_from);
                                    const endTime = new Date(app.time_to);
                                    const duration =
                                      (endTime.getTime() -
                                        startTime.getTime()) /
                                      (1000 * 60); // duration in minutes
                                    const height = Math.max(
                                      (duration / 60) * 80,
                                      36,
                                    ); // min height 36px
                                    const top =
                                      (startTime.getMinutes() / 60) * 80; // position based on minutes
                                    const needsExpansion =
                                      duration > 60 ||
                                      startTime.getMinutes() > 0 ||
                                      endTime.getMinutes() > 0;
                                    const priority =
                                      app.added_description?.priority ||
                                      "medium";
                                    const colorClass =
                                      getPriorityColor(priority);
                                    let appPressTimer: NodeJS.Timeout | null =
                                      null;
                                    return (
                                      <div
                                        key={idx}
                                        className={`${colorClass} rounded-xl shadow-lg p-4 sm:p-2 text-white cursor-pointer absolute left-2 right-2 group text-lg sm:text-sm ${view === "day" ? "hover:scale-101 transition-transform duration-200 ease-in-out hover:z-20" : view === "week" ? "hover:scale-105 transition-transform duration-200 ease-in-out hover:z-20" : ""}`}
                                        style={{
                                          height: `${height}px`,
                                          top: `${top}px`,
                                        }}
                                        title={`${app.title} - ${app.name} ${app.lastname}\n${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`}
                                        onClick={(e) => {
                                          if (window.innerWidth < 640) {
                                            handleAppointmentClick(app, e);
                                          } else {
                                            handleAppointmentClick(app, e);
                                          }
                                        }}
                                        draggable
                                        onDragStart={(e) =>
                                          handleDragStart(app, e)
                                        }
                                        onDragEnd={handleDragEnd}
                                        onTouchStart={(e) => {
                                          if (window.innerWidth < 640) {
                                            appPressTimer = setTimeout(() => {
                                              handleCellClick(date, hour);
                                            }, 400);
                                          }
                                        }}
                                        onTouchEnd={(e) => {
                                          if (
                                            window.innerWidth < 640 &&
                                            appPressTimer
                                          ) {
                                            clearTimeout(appPressTimer);
                                          }
                                        }}
                                      >
                                        <div className="font-semibold truncate">
                                          {app.title}
                                        </div>
                                        <div className="truncate text-xs">
                                          {app.name} {app.lastname}
                                        </div>
                                        <div className="text-xs mt-1 flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {format(startTime, "HH:mm")} -{" "}
                                          {format(endTime, "HH:mm")}
                                        </div>
                                        {/* Show end minute below the hour if appointment is long or ends at a non-zero minute */}
                                        {needsExpansion && (
                                          <div className="absolute right-2 bottom-2 text-xs text-white/80 font-bold">
                                            {endTime.getMinutes() !== 0 && (
                                              <span>
                                                {format(endTime, "mm")}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {cellAppointments.length === 0 && (
                                    <div
                                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      onClick={() =>
                                        handleCellClick(date, hour)
                                      }
                                    >
                                      <span className="w-5 h-5 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white">
                                        +
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-black text-white border border-gray-700 sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {editingAppointment ? "Edytuj termin" : "Nowy termin"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 max-h-[75vh] overflow-y-auto"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imię</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Imię"
                          {...field}
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwisko</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nazwisko"
                          {...field}
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Telefon"
                        {...field}
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tytuł</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Tytuł"
                        {...field}
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Opis (opcjonalnie)"
                        {...field}
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date Field with Calendar Picker */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Godzina rozpoczęcia</FormLabel>
                  <div className="flex space-x-2">
                    <FormField
                      control={form.control}
                      name="startHour"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                              <SelectValue placeholder="Godz" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border border-gray-700 text-white">
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem
                                  key={i}
                                  value={i.toString().padStart(2, "0")}
                                  className="hover:bg-gray-800"
                                >
                                  {i.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="startMinute"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border border-gray-700 text-white">
                              {minutes.map((minute) => (
                                <SelectItem
                                  key={minute}
                                  value={minute.toString().padStart(2, "0")}
                                  className="hover:bg-gray-800"
                                >
                                  {minute.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <FormLabel>Godzina zakończenia</FormLabel>
                  <div className="flex space-x-2">
                    <FormField
                      control={form.control}
                      name="endHour"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                              <SelectValue placeholder="Godz" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border border-gray-700 text-white">
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem
                                  key={i}
                                  value={i.toString().padStart(2, "0")}
                                  className="hover:bg-gray-800"
                                >
                                  {i.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endMinute"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent className="bg-black border border-gray-700 text-white">
                              {minutes.map((minute) => (
                                <SelectItem
                                  key={minute}
                                  value={minute.toString().padStart(2, "0")}
                                  className="hover:bg-gray-800"
                                >
                                  {minute.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Fields Expandable Section */}
              <div className="border border-gray-700 rounded-md overflow-hidden">
                <button
                  type="button"
                  className="flex items-center justify-between w-full p-3 bg-gray-900 border-b border-gray-700 focus:outline-none"
                  onClick={() => setShowAdditionalFields(!showAdditionalFields)}
                >
                  <span className="font-medium">Dodatkowe informacje</span>
                  {showAdditionalFields ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showAdditionalFields && (
                  <div className="p-3 space-y-4 bg-gray-900">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="added_description.contact_preference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferowany kontakt</FormLabel>
                            <Select
                              value={field.value || "telephone"}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="bg-black border-gray-700 text-white">
                                <SelectValue placeholder="Wybierz" />
                              </SelectTrigger>
                              <SelectContent className="bg-black border border-gray-700 text-white">
                                <SelectItem
                                  value="telephone"
                                  className="hover:bg-gray-800"
                                >
                                  Telefon
                                </SelectItem>
                                <SelectItem
                                  value="email"
                                  className="hover:bg-gray-800"
                                >
                                  Email
                                </SelectItem>
                                <SelectItem
                                  value="sms"
                                  className="hover:bg-gray-800"
                                >
                                  SMS
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="added_description.priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priorytet</FormLabel>
                            <Select
                              value={field.value || "medium"}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="bg-black border-gray-700 text-white">
                                <SelectValue placeholder="Wybierz" />
                              </SelectTrigger>
                              <SelectContent className="bg-black border border-gray-700 text-white">
                                <SelectItem
                                  value="high"
                                  className="hover:bg-gray-800"
                                >
                                  Wysoki
                                </SelectItem>
                                <SelectItem
                                  value="medium"
                                  className="hover:bg-gray-800"
                                >
                                  Średni
                                </SelectItem>
                                <SelectItem
                                  value="low"
                                  className="hover:bg-gray-800"
                                >
                                  Niski
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="added_description.notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notatki</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              className="bg-black border-gray-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="added_description.tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tagi (oddzielone przecinkami)</FormLabel>
                          <FormControl>
                            <Input
                              value={
                                typeof field.value === "string"
                                  ? field.value
                                  : Array.isArray(field.value)
                                    ? field.value.join(", ")
                                    : ""
                              }
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                field.onChange(inputValue);
                              }}
                              onBlur={(e) => {
                                const inputValue = e.target.value;
                                const tags = inputValue
                                  .split(",")
                                  .map((tag) => tag.trim())
                                  .filter(Boolean);
                                field.onChange(tags);
                              }}
                              placeholder="Wpisz tagi oddzielone przecinkami"
                              className="bg-black border-gray-700 text-white"
                            />
                          </FormControl>
                          {Array.isArray(field.value) &&
                            field.value.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {field.value.map((tag, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                {editingAppointment && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteAppointment}
                    className="w-full sm:w-auto order-3 sm:order-1"
                  >
                    Usuń
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto order-2 bg-black border-white text-white hover:bg-gray-900"
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto order-1 sm:order-3 bg-white text-black hover:bg-gray-200"
                >
                  {isLoading
                    ? "Zapisywanie..."
                    : editingAppointment
                      ? "Zapisz zmiany"
                      : "Zarezerwuj"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Side panel for showing appointments on a specific day (mobile) */}
      <Drawer open={showSheet} onOpenChange={setShowSheet}>
        <DrawerContent className="bg-black text-white border-t border-gray-700 max-h-[90vh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle className="text-xl">
              {selectedDateForSidebar &&
                format(selectedDateForSidebar, "EEEE, d MMMM yyyy", {
                  locale: pl,
                })}
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 max-h-96 overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Terminy</h3>
              <Button
                onClick={handleAddFromSidebar}
                size="sm"
                className="bg-white text-black hover:bg-gray-200"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Dodaj
              </Button>
            </div>

            {sidebarAppointments.length > 0 ? (
              <div className="space-y-2">
                {sidebarAppointments.map((appointment) => (
                  <div
                    key={appointment.uuid}
                    className="p-3 border border-gray-700 rounded-md hover:bg-gray-900 cursor-pointer"
                    onClick={() => {
                      handleAppointmentClick(
                        appointment,
                        {} as React.MouseEvent,
                      );
                      setShowSheet(false);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{appointment.title}</span>
                      <span className="text-sm text-gray-400">
                        {formatAppointmentTime(appointment)}
                      </span>
                    </div>
                    <div>
                      {appointment.name} {appointment.lastname}
                    </div>
                    {appointment.description && (
                      <div className="text-sm text-gray-300 mt-1 line-clamp-2">
                        {appointment.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Brak zaplanowanych terminów na ten dzień
              </div>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button
                variant="outline"
                className="bg-black border-white text-white hover:bg-gray-900"
              >
                Zamknij
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Scheduler;
