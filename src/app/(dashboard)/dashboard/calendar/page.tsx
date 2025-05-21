"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clients } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, isWithinInterval, isValid } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Client {
  uuid: string;
  name: string;
  lastname: string;
  title: string;
  time_from: string;
  time_to: string;
  added_description: {
    notes?: string;
    contact_preference?: string;
    priority: string;
    tags?: string[];
  };
}

export default function CalendarPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [calendarMode, setCalendarMode] = useState<"single" | "range">(
    "single",
  );
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(),
    to: undefined,
  });
  const [timeRange, setTimeRange] = useState<{
    from: string;
    to: string;
  }>({
    from: "00:00",
    to: "23:59",
  });
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"time" | "priority">("time");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Add useEffect for mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (dateRange.from) {
      fetchClients();
    } else {
      setClientsList([]);
    }
  }, [dateRange, timeRange, currentPage]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      if (!dateRange.from) return;

      // Create start and end dates based on calendar mode
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);

      const toDate =
        calendarMode === "single"
          ? new Date(dateRange.from)
          : dateRange.to || new Date(dateRange.from);
      toDate.setHours(23, 59, 59, 999);

      // Apply time range if specified
      if (timeRange.from !== "00:00") {
        const [fromHours, fromMinutes] = timeRange.from.split(":").map(Number);
        fromDate.setHours(fromHours, fromMinutes, 0, 0);
      }

      if (timeRange.to !== "23:59") {
        const [toHours, toMinutes] = timeRange.to.split(":").map(Number);
        toDate.setHours(toHours, toMinutes, 59, 999);
      }

      const perPage = isMobile ? 3 : 6;
      const response = await clients.getByDateRange(
        fromDate.toISOString(),
        toDate.toISOString(),
        currentPage,
        perPage,
      );

      // Update clients list and total pages
      console.log("API Response in fetchClients:", response);
      console.log(
        "Total clients from API (from pagination): ",
        response?.pagination?.total,
      );
      console.log(
        "Total pages from API pagination:",
        response?.pagination?.total_pages,
      );

      // Use total_pages directly from the API response pagination object
      const calculatedTotalPages = response?.pagination?.total_pages || 1;

      console.log(
        "Calculated total pages based on API pagination:",
        calculatedTotalPages,
      );
      setClientsList(Array.isArray(response.clients) ? response.clients : []);
      setTotalPages(calculatedTotalPages);
    } catch (error: any) {
      console.error("Error in calendar fetch:", error);
      toast({
        variant: "destructive",
        title: "Błąd",
        description:
          error.response?.data?.message || "Nie udało się pobrać spotkań",
      });
      setClientsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getClientsForDate = (date: Date) => {
    if (!isValid(date) || !Array.isArray(clientsList)) return [];

    return clientsList.filter((client) => {
      if (!client || !client.time_from) return false;

      const clientDate = new Date(client.time_from);
      if (!isValid(clientDate)) return false;

      const isOnTargetDate =
        clientDate.getFullYear() === date.getFullYear() &&
        clientDate.getMonth() === date.getMonth() &&
        clientDate.getDate() === date.getDate();

      if (!isOnTargetDate) return false;

      const clientHour = clientDate.getHours();
      const clientMinutes = clientDate.getMinutes();
      const [fromHours, fromMinutes] = timeRange.from.split(":").map(Number);
      const [toHours, toMinutes] = timeRange.to.split(":").map(Number);

      const clientTimeInMinutes = clientHour * 60 + clientMinutes;
      const fromTimeInMinutes = fromHours * 60 + fromMinutes;
      const toTimeInMinutes = toHours * 60 + toMinutes;

      return (
        clientTimeInMinutes >= fromTimeInMinutes &&
        clientTimeInMinutes <= toTimeInMinutes
      );
    });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale: pl });
  };

  const formatDateForUrl = (date: Date, time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    // Format as YYYY-MM-DDTHH:mm:ss
    return newDate.toISOString().slice(0, 19).replace("T", " ");
  };

  const handleClientClick = (client: Client) => {
    if (!client || !client.uuid) {
      router.push("/dashboard/clients");
      return;
    }

    // Navigate to client details using UUID
    router.push(`/dashboard/clients/${client.uuid}`);
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        options.push(
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>,
        );
      }
    }
    options.push(
      <SelectItem key="23:59" value="23:59">
        23:59
      </SelectItem>,
    );
    return options.sort((a, b) => a.key.localeCompare(b.key)); // Sortujemy opcje czasu
  };

  // Enhanced search function that includes time-based search
  const filteredClientsList = Array.isArray(clientsList)
    ? clientsList.filter((client) => {
        if (!client) return false;
        const lowerCaseQuery = searchQuery.toLowerCase().trim();
        const clientTime = format(new Date(client.time_from), "HH:mm");

        return (
          client.name?.toLowerCase().includes(lowerCaseQuery) ||
          client.lastname?.toLowerCase().includes(lowerCaseQuery) ||
          client.title?.toLowerCase().includes(lowerCaseQuery) ||
          client.added_description?.notes
            ?.toLowerCase()
            .includes(lowerCaseQuery) ||
          clientTime.includes(lowerCaseQuery)
        );
      })
    : [];

  // Priority filter
  const priorityFilteredClients =
    priorityFilter === "all"
      ? filteredClientsList
      : filteredClientsList.filter(
          (client) => client?.added_description?.priority === priorityFilter,
        );

  // Enhanced sorting function
  const sortedClients = [...priorityFilteredClients].sort((a, b) => {
    if (!a || !b) return 0;
    if (sortBy === "time") {
      return new Date(a.time_from).getTime() - new Date(b.time_from).getTime();
    } else {
      const priorityOrder: Record<string, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      const priorityA = priorityOrder[a.added_description?.priority || "low"];
      const priorityB = priorityOrder[b.added_description?.priority || "low"];
      return (
        priorityA - priorityB ||
        new Date(a.time_from).getTime() - new Date(b.time_from).getTime()
      );
    }
  });

  // Generujemy i sortujemy listę stringów czasowych do SelectItem
  const generateTimeOptionsList = () => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        times.push(
          `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        );
      }
    }
    times.push("23:59"); // Dodaj opcję 23:59
    return times.sort(); // Sortujemy alfabetycznie
  };

  // Logowanie dat spotkań z pobranej listy (przed renderowaniem)
  console.log(
    "Client time_from values in clientsList:",
    clientsList.map((client) => client.time_from),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kalendarz</h1>
        <p className="text-muted-foreground">
          Przeglądaj i zarządzaj spotkaniami
        </p>
        <div className="mt-4 flex items-center space-x-4">
          <Input
            placeholder="Szukaj spotkań (imię, nazwisko, tytuł, godzina, notatki)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            value={calendarMode}
            onValueChange={(value: "single" | "range") => {
              setCalendarMode(value);
              if (value === "single") {
                setDateRange((prev) => ({ from: prev.from, to: undefined }));
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tryb kalendarza" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Pojedynczy dzień</SelectItem>
              <SelectItem value="range">Zakres dat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kalendarz</CardTitle>
            <CardDescription>
              {calendarMode === "single"
                ? "Wybierz datę i zakres godzin, aby zobaczyć spotkania"
                : "Wybierz zakres dat i godzin, aby zobaczyć spotkania"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode={calendarMode}
              selected={calendarMode === "single" ? dateRange.from : dateRange}
              onSelect={(date) => {
                if (calendarMode === "single") {
                  setDateRange({ from: date, to: undefined });
                } else {
                  setDateRange(date);
                }
              }}
              className="rounded-md border"
              modifiers={{
                hasAppointments: (date) => getClientsForDate(date).length > 0,
              }}
              modifiersStyles={{
                hasAppointments: {
                  fontWeight: "bold",
                  color: "var(--primary)",
                },
              }}
            />
            {currentPage < totalPages && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  className="w-full sm:w-auto"
                >
                  Następna strona
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Od godziny:</span>
                <div className="flex space-x-2">
                  <Select
                    value={timeRange.from}
                    onValueChange={(value) =>
                      setTimeRange((prev) => ({ ...prev, from: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz godzinę" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptionsList().map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentPage < totalPages && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      className="whitespace-nowrap"
                    >
                      Następna strona
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Do godziny:</span>
                <Select
                  value={timeRange.to}
                  onValueChange={(value) =>
                    setTimeRange((prev) => ({ ...prev, to: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz godzinę" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeOptionsList().map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {dateRange.from ? (
                calendarMode === "single" ? (
                  `Spotkania na dzień ${format(dateRange.from, "d MMMM yyyy", { locale: pl })}`
                ) : (
                  <>
                    Spotkania od{" "}
                    {format(dateRange.from, "d MMMM yyyy", { locale: pl })} do{" "}
                    {dateRange.to
                      ? format(dateRange.to, "d MMMM yyyy", { locale: pl })
                      : "..."}
                  </>
                )
              ) : (
                "Wybierz datę"
              )}
            </CardTitle>
            <CardDescription>
              {dateRange.from
                ? `Godziny: ${timeRange.from} - ${timeRange.to}`
                : "Lista zaplanowanych spotkań"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!dateRange.from ? (
              <div className="text-center text-muted-foreground">
                Wybierz datę, aby zobaczyć spotkania
              </div>
            ) : isLoading ? (
              <div className="text-center">Ładowanie...</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 mb-4">
                  <Label htmlFor="sort">Sortuj wg:</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(value: "time" | "priority") =>
                      setSortBy(value)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sortuj" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Czasu</SelectItem>
                      <SelectItem value="priority">Priorytetu</SelectItem>
                    </SelectContent>
                  </Select>

                  <Label htmlFor="priorityFilter">Pokaż priorytet:</Label>
                  <Select
                    value={priorityFilter}
                    onValueChange={setPriorityFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Wszystkie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      <SelectItem value="high">Wysoki</SelectItem>
                      <SelectItem value="medium">Średni</SelectItem>
                      <SelectItem value="low">Niski</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sortedClients.length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    {searchQuery || priorityFilter !== "all"
                      ? "Brak spotkań pasujących do kryteriów"
                      : "Brak spotkań w wybranym zakresie"}
                  </div>
                ) : (
                  <>
                    {sortedClients.map((client) => (
                      <div
                        key={client.uuid}
                        className="flex cursor-pointer items-center justify-between rounded-lg border p-4 hover:bg-accent"
                        onClick={() => handleClientClick(client)}
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {client.name} {client.lastname}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {client.title}
                          </div>
                          {client.added_description && (
                            <div className="mt-2 space-y-1">
                              {client.added_description.notes && (
                                <div className="text-sm text-muted-foreground">
                                  Notatki: {client.added_description.notes}
                                </div>
                              )}
                              {client.added_description.contact_preference && (
                                <div className="text-sm text-muted-foreground">
                                  Preferowany kontakt:{" "}
                                  {client.added_description
                                    .contact_preference === "telephone"
                                    ? "Telefon"
                                    : "Email"}
                                </div>
                              )}
                              {client.added_description.tags &&
                                client.added_description.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {client.added_description.tags.map(
                                      (tag, index) => (
                                        <span
                                          key={index}
                                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                        >
                                          {tag}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-medium">
                            {formatTime(client.time_from)} -{" "}
                            {formatTime(client.time_to)}
                          </div>
                          <div
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              client.added_description?.priority === "high"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                : client.added_description?.priority ===
                                    "medium"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            }`}
                          >
                            {client.added_description?.priority === "high"
                              ? "Wysoki"
                              : client.added_description?.priority === "medium"
                                ? "Średni"
                                : "Niski"}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row justify-center items-center gap-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          className="w-full sm:w-auto"
                        >
                          Poprzednia
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-sm whitespace-nowrap">
                            Strona {currentPage} z {totalPages}
                          </span>
                          {currentPage < totalPages && (
                            <Button
                              variant="outline"
                              onClick={() =>
                                setCurrentPage((prev) =>
                                  Math.min(prev + 1, totalPages),
                                )
                              }
                              className="w-full sm:w-auto"
                            >
                              Następna
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {currentPage < totalPages && (
                      <div className="flex justify-center mt-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages),
                            )
                          }
                          className="w-full sm:w-auto"
                        >
                          Następna strona
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

