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
} from "@/components/ui/sheet";
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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { clients } from "@/lib/api";
import * as z from "zod";
import { Calendar } from "@/components/ui/calendar";

// View types
type ViewType = "month" | "week" | "day";

// Appointment form schema
const appointmentSchema = z.object({
  name: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  lastname: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  telephone: z.string().min(9, "Nieprawidłowy numer telefonu"),
  title: z.string().min(2, "Tytuł musi mieć minimum 2 znaki"),
  description: z.string().optional(),
  startHour: z.string(),
  startMinute: z.string(),
  endHour: z.string(),
  endMinute: z.string(),
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

  // Get hours for the time slots (8:00 - 20:00)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

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
      startHour: "08",
      startMinute: "00",
      endHour: "09",
      endMinute: "00",
      added_description: {
        contact_preference: "telephone",
        priority: "medium",
        notes: "",
        tags: [],
      },
    },
  });

  // Calculate the dates to show based on the selected view
  const getDatesToShow = () => {
    if (view === "month") {
      const firstDay = startOfMonth(currentDate);
      const lastDay = endOfMonth(currentDate);

      // Get the first day of the week the month starts on
      const start = startOfWeek(firstDay, { weekStartsOn: 1 });

      // Generate 42 days (6 weeks) to ensure we cover the entire month view
      return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    } else if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else {
      // For day view, return just the current date
      return [currentDate];
    }
  };

  const datesToShow = getDatesToShow();

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
        from = startOfDay(currentDate);
        to = endOfDay(currentDate);
      }

      // Fetch appointments from API
      const response = await clients.getByDateRange(
        from.toISOString(),
        to.toISOString(),
        1,
        100, // Get more appointments to ensure we show them all
      );

      setAppointments(response.clients || []);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać harmonogramu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Call fetchAppointments when view or date changes
  useEffect(() => {
    fetchAppointments();
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

  // Handle cell click to open appointment form
  const handleCellClick = (date: Date, hour: number) => {
    setSelectedDate(date);

    // Format hour with leading zero if needed
    const hourStr = hour.toString().padStart(2, "0");
    setSelectedTime(`${hourStr}:00`);

    // Reset form
    form.reset({
      name: "",
      lastname: "",
      telephone: "",
      title: "",
      description: "",
      startHour: hourStr,
      startMinute: "00",
      endHour: (hour + 1).toString().padStart(2, "0"), // Default end time is 1 hour later
      endMinute: "00",
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

  // Handle appointment click to edit
  const handleAppointmentClick = (
    appointment: Appointment,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();

    const timeFrom = new Date(appointment.time_from);
    const timeTo = new Date(appointment.time_to);

    setSelectedDate(timeFrom);
    setSelectedTime(
      `${timeFrom.getHours().toString().padStart(2, "0")}:${timeFrom.getMinutes().toString().padStart(2, "0")}`,
    );

    form.reset({
      name: appointment.name,
      lastname: appointment.lastname,
      telephone: appointment.telephone,
      title: appointment.title,
      description: appointment.description || "",
      startHour: timeFrom.getHours().toString().padStart(2, "0"),
      startMinute: timeFrom.getMinutes().toString().padStart(2, "0"),
      endHour: timeTo.getHours().toString().padStart(2, "0"),
      endMinute: timeTo.getMinutes().toString().padStart(2, "0"),
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

  // Submit appointment form
  const onSubmit = async (data: z.infer<typeof appointmentSchema>) => {
    if (!selectedDate) return;

    try {
      setIsLoading(true);

      // Create a new date object for the appointment
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(
        parseInt(data.startHour),
        parseInt(data.startMinute),
        0,
        0,
      );

      // Create end time using the selected end time
      const endTime = new Date(selectedDate);
      endTime.setHours(parseInt(data.endHour), parseInt(data.endMinute), 0, 0);

      // Prepare appointment data
      const appointmentData = {
        name: data.name,
        lastname: data.lastname,
        telephone: data.telephone,
        title: data.title,
        description: data.description || "",
        time_from: appointmentDate.toISOString().split(".")[0],
        time_to: endTime.toISOString().split(".")[0],
        datetime: new Date().toISOString().split(".")[0],
        added_description: {
          contact_preference:
            data.added_description?.contact_preference || "telephone",
          priority: data.added_description?.priority || "medium",
          notes: data.added_description?.notes || "",
          tags: data.added_description?.tags || [],
        },
      };

      if (editingAppointment) {
        // Update existing appointment
        await clients.update(editingAppointment.uuid, appointmentData);
        toast({
          title: "Sukces",
          description: "Termin został zaktualizowany",
        });
      } else {
        // Submit new appointment
        await clients.create(appointmentData);
        toast({
          title: "Sukces",
          description: "Termin został zarezerwowany",
        });
      }

      // Close modal and reset form
      setIsModalOpen(false);
      form.reset();

      // Refresh appointments
      fetchAppointments(true);
    } catch (error) {
      console.error("Failed to save appointment:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać terminu",
        variant: "destructive",
      });
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

  return (
    <div className="container mx-auto px-4 py-6 bg-black text-white dark">
      <Card className="border-none shadow-none bg-black text-white">
        <CardHeader className="px-0">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <CardTitle className="text-2xl md:text-3xl font-bold">
              {getHeaderTitle()}
            </CardTitle>
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={navigatePrevious}
                className="bg-black border-white text-white hover:bg-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={navigateToday}
                className="bg-black border-white text-white hover:bg-gray-800"
              >
                Dzisiaj
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={navigateNext}
                className="bg-black border-white text-white hover:bg-gray-800"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Select
                value={view}
                onValueChange={(value) => setView(value as ViewType)}
              >
                <SelectTrigger className="w-[120px] bg-black border-white text-white">
                  <SelectValue placeholder="Widok" />
                </SelectTrigger>
                <SelectContent className="bg-black border border-white text-white">
                  <SelectItem value="month" className="hover:bg-gray-800">
                    Miesiąc
                  </SelectItem>
                  <SelectItem value="week" className="hover:bg-gray-800">
                    Tydzień
                  </SelectItem>
                  <SelectItem value="day" className="hover:bg-gray-800">
                    Dzień
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="flex overflow-hidden border border-white">
            {/* Time column - only shown for week and day views */}
            {(view === "week" || view === "day") && (
              <div className="w-16 flex-shrink-0 border-r border-gray-700">
                <div className="h-12"></div>{" "}
                {/* Empty cell for header alignment */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-20 flex items-center justify-center border-t border-gray-700"
                  >
                    <span className="text-xs font-medium text-gray-300">{`${hour}:00`}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-grow overflow-auto">
              {/* Grid Header */}
              <div className="flex">
                {view === "month"
                  ? // Month view header (M T W T F S S)
                    ["Pon", "Wt", "Śr", "Czw", "Pt", "Sb", "Nd"].map(
                      (day, i) => (
                        <div
                          key={i}
                          className="flex-1 h-12 flex items-center justify-center border-b border-gray-700"
                        >
                          <span className="text-sm font-medium text-gray-300">
                            {day}
                          </span>
                        </div>
                      ),
                    )
                  : // Week and day view header
                    datesToShow.map((date, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-12 flex flex-col items-center justify-center border-b ${
                          format(date, "yyyy-MM-dd") ===
                          format(new Date(), "yyyy-MM-dd")
                            ? "bg-gray-900"
                            : ""
                        } border-gray-700`}
                      >
                        <span className="text-xs text-gray-400">
                          {format(date, "EEE", { locale: pl })}
                        </span>
                        <span className="text-sm font-medium">
                          {format(date, "d")}
                        </span>
                      </div>
                    ))}
              </div>

              {/* Grid Content */}
              {view === "month" ? (
                // Month view grid
                <div className="grid grid-cols-7 auto-rows-fr">
                  {datesToShow.map((date, i) => {
                    const isCurrentMonth =
                      date.getMonth() === currentDate.getMonth();
                    const isToday =
                      format(date, "yyyy-MM-dd") ===
                      format(new Date(), "yyyy-MM-dd");
                    const dateAppointments = getAppointmentsForDate(date);

                    return (
                      <div
                        key={i}
                        className={`h-28 p-1 border-t border-l ${i % 7 === 6 ? "border-r" : ""} ${
                          isToday ? "bg-gray-900" : "bg-black"
                        } ${!isCurrentMonth ? "text-gray-600" : "text-gray-900"} border-gray-700`}
                        onClick={() => goToDateView(date)}
                      >
                        <div className="text-right mb-1">
                          <span className="text-xs font-medium">
                            {format(date, "d")}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {dateAppointments.slice(0, 2).map((app, idx) => (
                            <div
                              key={idx}
                              className="bg-white bg-opacity-10 rounded px-1 py-0.5 text-xs truncate cursor-pointer"
                              title={`${app.title} - ${app.name} ${app.lastname}`}
                              onClick={(e) => handleAppointmentClick(app, e)}
                            >
                              {format(new Date(app.time_from), "HH:mm")}{" "}
                              {app.title}
                            </div>
                          ))}
                          {dateAppointments.length > 2 && (
                            <div className="text-xs text-gray-400">
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
                <div className="relative">
                  <div className="flex">
                    {datesToShow.map((date, dateIndex) => (
                      <div key={dateIndex} className="flex-1">
                        {hours.map((hour) => {
                          const cellAppointments =
                            getAppointmentsForDateAndHour(date, hour);
                          return (
                            <div
                              key={`${dateIndex}-${hour}`}
                              className="h-20 border-t border-l border-gray-700 relative group bg-black hover:bg-gray-900"
                              onClick={() => handleCellClick(date, hour)}
                            >
                              {cellAppointments.map((app, idx) => (
                                <div
                                  key={idx}
                                  className="bg-gray-600 bg-opacity-10 rounded m-1 p-1 text-xs h-[calc(100%-0.5rem)] overflow-hidden cursor-pointer"
                                  title={`${app.title} - ${app.name} ${app.lastname}`}
                                  onClick={(e) =>
                                    handleAppointmentClick(app, e)
                                  }
                                >
                                  <div className="font-semibold truncate">
                                    {app.title}
                                  </div>
                                  <div className="truncate">
                                    {app.name} {app.lastname}
                                  </div>
                                </div>
                              ))}
                              {cellAppointments.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* Appointment Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-black text-white border border-gray-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {editingAppointment ? "Edytuj termin" : "Nowy termin"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              <div>
                <FormLabel>Data</FormLabel>
                <div className="border border-gray-700 rounded-md p-2 text-sm bg-gray-900">
                  {selectedDate &&
                    format(selectedDate, "EEEE, d MMMM yyyy", { locale: pl })}
                </div>
              </div>

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
                                Array.isArray(field.value)
                                  ? field.value.join(", ")
                                  : ""
                              }
                              onChange={(e) => {
                                const tags = e.target.value
                                  .split(",")
                                  .map((tag) => tag.trim())
                                  .filter(Boolean);
                                field.onChange(tags);
                              }}
                              className="bg-black border-gray-700 text-white"
                            />
                          </FormControl>
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
    </div>
  );
};

export default Scheduler;
