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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  };
}

export default function CalendarPage() {
  const router = useRouter();
  const { toast } = useToast();
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

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchClients();
    } else {
        setClientsList([]); // Clear list if date range is incomplete
    }
  }, [dateRange, timeRange]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      if (!dateRange.from || !dateRange.to) return;

      // Tworzymy nowe daty, zerując czas z oryginalnych dateRange.from/to
      const fromDate = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
      const toDate = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
      
      // Ustawiamy godziny z timeRange
      const [fromHours, fromMinutes] = timeRange.from.split(':').map(Number);
      const [toHours, toMinutes] = timeRange.to.split(':').map(Number);
      
      // Korekcja dla "23:59" - ustawiamy na koniec dnia
      if (timeRange.to === "23:59") {
         toDate.setHours(23, 59, 59, 999);
      } else {
        fromDate.setHours(fromHours, fromMinutes, 0, 0);
        toDate.setHours(toHours, toMinutes, 59, 999);
      }

      console.log('Fetching clients for date range:', {
        startDate: fromDate.toISOString(),
        endDate: toDate.toISOString()
      });
      console.log('Time range:', timeRange);
      console.log('Dates sent to API:', {
          from: fromDate.toISOString(), to: toDate.toISOString()
      });

      const response = await clients.getByDateRange(
        fromDate.toISOString(),
        toDate.toISOString()
      );
      console.log('Calendar clients response:', response);
      setClientsList(response);
    } catch (error: any) {
      console.error('Error in calendar fetch:', error);;
      toast({
        variant: "destructive",
        title: "Błąd",
        description: error.response?.data?.message || "Nie udało się pobrać spotkań",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getClientsForDate = (date: Date) => {
    // Ensure the date being checked is valid
    if (!isValid(date)) return [];

    // This function is primarily for the calendar modifier to highlight days
    // It filters the already fetched list (clientsList) for the specific day and time range

    return clientsList.filter((client) => {
      const clientDate = new Date(client.time_from); // Date object from client appointment time

      // Check if clientDate is valid
      if (!isValid(clientDate)) return false;

      // Check if the client date is on the specific date being checked by the modifier
      const isOnTargetDate =
        clientDate.getFullYear() === date.getFullYear() &&
        clientDate.getMonth() === date.getMonth() &&
        clientDate.getDate() === date.getDate();

      if (!isOnTargetDate) return false;

      // Check if the client time is within the selected time range
      const clientHour = clientDate.getHours();
      const clientMinutes = clientDate.getMinutes();
      const [fromHours, fromMinutes] = timeRange.from.split(':').map(Number);
      const [toHours, toMinutes] = timeRange.to.split(':').map(Number);

      const clientTimeInMinutes = clientHour * 60 + clientMinutes;
      const fromTimeInMinutes = fromHours * 60 + fromMinutes;
      const toTimeInMinutes = toHours * 60 + toMinutes;

      // Handle time range spanning across midnight
      if (fromTimeInMinutes > toTimeInMinutes) {
        return clientTimeInMinutes >= fromTimeInMinutes || clientTimeInMinutes <= toTimeInMinutes;
      } else {
        return clientTimeInMinutes >= fromTimeInMinutes && clientTimeInMinutes <= toTimeInMinutes;
      }
    });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale: pl });
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        );
      }
    }
    options.push(
        <SelectItem key="23:59" value="23:59">
            23:59
        </SelectItem>
    );
    return options.sort((a, b) => a.key.localeCompare(b.key)); // Sortujemy opcje czasu
  };

  // Funkcja filtrująca listę klientów na podstawie zapytania wyszukiwania
  const filteredClientsList = clientsList.filter(client => {
    const lowerCaseQuery = searchQuery.toLowerCase().trim();
    return (
      client.name.toLowerCase().includes(lowerCaseQuery) ||
      client.lastname.toLowerCase().includes(lowerCaseQuery) ||
      client.title.toLowerCase().includes(lowerCaseQuery) ||
      client.added_description?.notes?.toLowerCase().includes(lowerCaseQuery) // Jeśli masz notatki w added_description
    );
  });

  // Funkcja filtrująca po priorytecie
  const priorityFilteredClients = priorityFilter === "all"
    ? filteredClientsList
    : filteredClientsList.filter(client => client.added_description?.priority === priorityFilter);

  // Funkcja sortująca
  const sortedClients = [...priorityFilteredClients].sort((a, b) => {
      if (sortBy === "time") {
          return new Date(a.time_from).getTime() - new Date(b.time_from).getTime();
      } else { // sortBy === "priority"
          const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
          const priorityA = priorityOrder[a.added_description?.priority || 'low'];
          const priorityB = priorityOrder[b.added_description?.priority || 'low'];
          // Sortuj malejąco dla priorytetu (wyższy priorytet na górze), a następnie chronologicznie
          return priorityA - priorityB || new Date(a.time_from).getTime() - new Date(b.time_from).getTime();
      }
  });

  // Generujemy i sortujemy listę stringów czasowych do SelectItem
  const generateTimeOptionsList = () => {
      const times: string[] = [];
      for (let hour = 0; hour < 24; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
              times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
          }
      }
      times.push("23:59"); // Dodaj opcję 23:59
      return times.sort(); // Sortujemy alfabetycznie
  };

  // Logowanie dat spotkań z pobranej listy (przed renderowaniem)
  console.log('Client time_from values in clientsList:', clientsList.map(client => client.time_from));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kalendarz</h1>
        <p className="text-muted-foreground">
          Przeglądaj i zarządzaj spotkaniami
        </p>
        {/* Pole wyszukiwania */}
        <div className="mt-4">
          <Input
            placeholder="Szukaj spotkań (imię, nazwisko, tytuł, notatki)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kalendarz</CardTitle>
            <CardDescription>
              Wybierz zakres dat i godzin, aby zobaczyć spotkania
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range: any) => setDateRange(range)}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Od godziny:</span>
                <Select 
                  value={timeRange.from} 
                  onValueChange={(value) => setTimeRange(prev => ({ ...prev, from: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz godzinę" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeOptionsList().map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Do godziny:</span>
                <Select 
                  value={timeRange.to} 
                  onValueChange={(value) => setTimeRange(prev => ({ ...prev, to: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz godzinę" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateTimeOptionsList().map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
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
              {dateRange.from && dateRange.to ? (
                <>
                  Spotkania od {format(dateRange.from, "d MMMM yyyy", { locale: pl })} do{" "}
                  {format(dateRange.to, "d MMMM yyyy", { locale: pl })}
                </>
              ) : (
                "Wybierz zakres dat"
              )}
            </CardTitle>
            <CardDescription>
              {dateRange.from && dateRange.to ? (
                `Godziny: ${timeRange.from} - ${timeRange.to}`
              ) : (
                "Lista zaplanowanych spotkań"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!(dateRange.from && dateRange.to) ? (
              <div className="text-center text-muted-foreground">
                Wybierz zakres dat, aby zobaczyć spotkania
              </div>
            ) : isLoading ? (
              <div className="text-center">Ładowanie...</div>
            ) : sortedClients.length === 0 ? (
              <div className="text-center text-muted-foreground">
                {/* Komunikat gdy lista jest pusta po filtrowaniu/wyszukiwaniu */}
                {searchQuery || priorityFilter !== "all" || (dateRange.from && dateRange.to && clientsList.length > 0 && sortedClients.length === 0)
                  ? "Brak spotkań pasujących do kryteriów"
                  : "Brak spotkań w wybranym zakresie"}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Zmieniamy, aby mapować posortowaną i przefiltrowaną listę */}
                <div className="flex items-center space-x-4 mb-4">
                    <Label htmlFor="sort">Sortuj wg:</Label>
                    <Select value={sortBy} onValueChange={(value: "time" | "priority") => setSortBy(value)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sortuj" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="time">Czasu</SelectItem>
                            <SelectItem value="priority">Priorytetu</SelectItem>
                        </SelectContent>
                    </Select>

                    <Label htmlFor="priorityFilter">Pokaż priorytet:</Label>
                     <Select value={priorityFilter} onValueChange={setPriorityFilter} disabled={clientsList.length === 0 && !isLoading}>
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

                {sortedClients.map((client) => (
                  <div
                    key={client.uuid}
                    className="flex cursor-pointer items-center justify-between rounded-lg border p-4 hover:bg-accent"
                    onClick={() =>
                      router.push(`/dashboard/clients/${client.uuid}`)
                    }
                  >
                    <div>
                      <div className="font-medium">
                        {client.name} {client.lastname}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {client.title}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatTime(client.time_from)} -{" "}
                        {formatTime(client.time_to)}
                      </div>
                      <div
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          client.added_description.priority === "high"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            : client.added_description.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        }`}
                      >
                        {client.added_description.priority === "high"
                          ? "Wysoki"
                          : client.added_description.priority === "medium"
                          ? "Średni"
                          : "Niski"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 