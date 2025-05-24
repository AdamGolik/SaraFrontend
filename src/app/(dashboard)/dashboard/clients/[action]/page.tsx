"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { clients } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, setHours, setMinutes, parse } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  lastname: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  telephone: z.string().min(9, "Nieprawidłowy numer telefonu"),
  title: z.string().min(2, "Tytuł musi mieć minimum 2 znaki"),
  description: z.string().min(2, "Opis musi mieć minimum 2 znaki"),
  date: z.date(),
  startHour: z.string(),
  startMinute: z.string(),
  endHour: z.string(),
  endMinute: z.string(),
  datetime: z.date(),
  added_description: z.object({
    contact_preference: z.string().optional(),
    priority: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    custom_fields: z.record(z.any()).optional(),
  }),
});

type TimePickerProps = {
  date: Date;
  onChange: (date: Date) => void;
};

function TimePicker({ date, onChange }: TimePickerProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleHourChange = (hour: number) => {
    const newDate = setHours(date, hour);
    onChange(newDate);
  };

  const handleMinuteChange = (minute: number) => {
    const newDate = setMinutes(date, minute);
    onChange(newDate);
  };

  return (
    <div className="flex space-x-2">
      <Select
        value={date.getHours().toString()}
        onValueChange={(value) => handleHourChange(parseInt(value))}
      >
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="Godz" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((hour) => (
            <SelectItem key={hour} value={hour.toString()}>
              {hour.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={date.getMinutes().toString()}
        onValueChange={(value) => handleMinuteChange(parseInt(value))}
      >
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((minute) => (
            <SelectItem key={minute} value={minute.toString()}>
              {minute.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface CustomField {
  key: string;
  value: string | string[];
  type: "string" | "array" | "number";
}

export default function ClientFormPage({
  params,
}: {
  params: { action: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldsPage, setCustomFieldsPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const isEdit = params.action !== "new";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      lastname: "",
      telephone: "",
      title: "",
      description: "",
      date: new Date(),
      startHour: "09",
      startMinute: "00",
      endHour: "17",
      endMinute: "00",
      datetime: new Date(),
      added_description: {
        contact_preference: "telephone",
        priority: "medium",
        notes: "",
        tags: [],
        custom_fields: {},
      },
    },
  });

  useEffect(() => {
    if (isEdit) {
      fetchClient();
    } else {
      // Process URL parameters for new clients
      const urlDate = searchParams.get("date");
      const urlHour = searchParams.get("hour");
      const urlMinute = searchParams.get("minute");

      // Set defaults
      let selectedDate = new Date();
      let startHour = "09";
      let startMinute = "00";

      // Parse date from URL if provided
      if (urlDate) {
        try {
          // Try to parse the date in YYYY-MM-DD format
          const parsedDate = parse(urlDate, "yyyy-MM-dd", new Date());
          if (!isNaN(parsedDate.getTime())) {
            selectedDate = parsedDate;
          }
        } catch (error) {
          console.error("Error parsing date:", error);
        }
      }

      // Parse hour from URL if provided
      if (urlHour) {
        const hourNum = parseInt(urlHour);
        if (!isNaN(hourNum) && hourNum >= 0 && hourNum < 24) {
          startHour = hourNum.toString().padStart(2, "0");
        }
      }

      // Parse minute from URL if provided
      if (urlMinute) {
        const minuteNum = parseInt(urlMinute);
        if (!isNaN(minuteNum) && minuteNum >= 0 && minuteNum < 60) {
          // Round to nearest 5 minutes for compatibility with the form
          const roundedMinute = Math.round(minuteNum / 5) * 5;
          startMinute = roundedMinute.toString().padStart(2, "0");
        }
      }

      // Set form values
      form.setValue("date", selectedDate);
      form.setValue("startHour", startHour);
      form.setValue("startMinute", startMinute);
      form.setValue("datetime", new Date());

      // Calculate end time (default 1 hour after start time)
      let endHour = parseInt(startHour);
      let endMinute = parseInt(startMinute);

      endHour = (endHour + 1) % 24;
      form.setValue("endHour", endHour.toString().padStart(2, "0"));
      form.setValue("endMinute", endMinute.toString().padStart(2, "0"));
    }
  }, [isEdit, searchParams]);

  const detectFieldType = (value: any): "string" | "array" | "number" => {
    if (Array.isArray(value)) return "array";
    if (typeof value === "number") return "number";
    return "string";
  };  

  const fetchClient = async () => {
    try {
      setIsLoading(true);
      const response = await clients.getById(params.action);
      console.log("Client fetch response:", response);

      // Convert all added_description fields to custom fields
      const customFieldsArray = Object.entries(response.added_description || {})
        .map(([key, value]) => {
          // Skip standard fields that have their own form controls
          if (
            ["contact_preference", "priority", "notes", "tags"].includes(key)
          ) {
            return null;
          }
          // Ensure custom field value is treated as string for editing in Input fields, except for arrays
          const processedValue = Array.isArray(value) ? value : String(value);
          return {
            key,
            value: processedValue,
            type: Array.isArray(value)
              ? "array"
              : typeof value === "number"
                ? "number"
                : "string",
          };
        })
        .filter(Boolean) as CustomField[];

      setCustomFields(customFieldsArray);

      // Parse time strings from API to Date objects
      const timeFromDate = new Date(response.time_from);
      const timeToDate = new Date(response.time_to);
      const datetimeDate = new Date(response.datetime);

      console.log("Parsed dates:", {
        timeFrom: timeFromDate,
        timeTo: timeToDate,
        datetime: datetimeDate
      });

      // Set form values with proper data types
      form.setValue("name", response.name || "");
      form.setValue("lastname", response.lastname || "");
      form.setValue("telephone", response.telephone || "");
      form.setValue("title", response.title || "");
      form.setValue("description", response.description || "");
      form.setValue("date", timeFromDate);
      form.setValue("datetime", datetimeDate);
      
      // Set time fields from parsed dates
      form.setValue("startHour", timeFromDate.getHours().toString().padStart(2, "0"));
      form.setValue("startMinute", timeFromDate.getMinutes().toString().padStart(2, "0"));
      form.setValue("endHour", timeToDate.getHours().toString().padStart(2, "0"));
      form.setValue("endMinute", timeToDate.getMinutes().toString().padStart(2, "0"));

      // Set added_description fields
      const addedDesc = response.added_description || {};
      form.setValue("added_description", {
        contact_preference: addedDesc.contact_preference || "telephone",
        priority: addedDesc.priority || "medium",
        notes: addedDesc.notes || "",
        tags: Array.isArray(addedDesc.tags) ? addedDesc.tags : [],
        custom_fields: {},
      });

      console.log("Form values set:", {
        startHour: form.getValues("startHour"),
        startMinute: form.getValues("startMinute"),
        endHour: form.getValues("endHour"),
        endMinute: form.getValues("endMinute"),
      });

    } catch (error) {
      console.error("Failed to fetch client:", error);
      toast({
        variant: "destructive",
        title: "Błąd",
        description: "Nie udało się pobrać danych klienta",
      });
      router.push("/dashboard"); // Redirect on error
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: "", value: "", type: "string" }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, field: CustomField) => {
    const newFields = [...customFields];
    newFields[index] = field;
    setCustomFields(newFields);
  };

  const handleCustomFieldValueChange = (index: number, value: string) => {
    const field = customFields[index];
    let newValue: string | string[] = value;
    
    if (field.type === "array") {
      newValue = value;
    } else if (field.type === "number") {
      newValue = value.replace(/[^0-9.-]/g, "");
    }
    
    updateCustomField(index, { ...field, value: newValue });
  };

  const handleCustomFieldTypeChange = (index: number, type: "string" | "array" | "number") => {
    const field = customFields[index];
    let newValue: string | string[] = "";
    
    if (type === "array") {
      newValue = "";
    } else if (type === "number") {
      newValue = "";
    }
    
    updateCustomField(index, { ...field, type, value: newValue });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      console.log("Form values on submit:", values);
      
      const customFieldsObject = customFields.reduce(
        (acc, { key, value, type }) => {
          if (key && value) {
            if (type === "array") {
              acc[key] = typeof value === 'string' ? value.split(",").map(item => item.trim()).filter(Boolean) : value;
            } else if (type === "number") {
              acc[key] = Number(value);
            } else {
              acc[key] = value;
            }
          }
          return acc;
        },
        {} as Record<string, any>,
      );

      // Create time_from and time_to dates from the selected date and times
      const timeFrom = new Date(values.date);
      timeFrom.setHours(
        parseInt(values.startHour) + 2,
        parseInt(values.startMinute),
        0,
        0
      );
      
      const timeTo = new Date(values.date);
      timeTo.setHours(
        parseInt(values.endHour) + 2,
        parseInt(values.endMinute),
        0,
        0
      );

      // Validate that end time is after start time
      if (timeTo <= timeFrom) {
        toast({
          variant: "destructive",
          title: "Błąd",
          description: "Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia",
        });
        return;
      }

      console.log("Time calculation:", {
        date: values.date,
        startHour: values.startHour,
        startMinute: values.startMinute,
        endHour: values.endHour,
        endMinute: values.endMinute,
        timeFrom: timeFrom,
        timeTo: timeTo
      });

      const clientData = {
        name: values.name,
        lastname: values.lastname,
        telephone: values.telephone,
        title: values.title,
        description: values.description,
        time_from: timeFrom.toISOString().split(".")[0],
        time_to: timeTo.toISOString().split(".")[0],
        datetime: values.datetime.toISOString().split(".")[0],
        added_description: {
          ...customFieldsObject,
          contact_preference:
            values.added_description.contact_preference || "telephone",
          priority: values.added_description.priority || "medium",
          notes: values.added_description.notes || "",
          tags: values.added_description.tags || [],
        },
      };

      console.log("Client data to send:", clientData);

      if (isEdit) {
        await clients.update(params.action, clientData);
        toast({
          title: "Sukces",
          description: "Klient został zaktualizowany",
        });
      } else {
        try {
          const response = await clients.create(clientData);
          console.log("Client created:", response);
          toast({
            title: "Sukces",
            description: "Klient został dodany",
          });
        } catch (error: any) {
          if (error.response?.status === 409) {
            toast({
              variant: "destructive",
              title: "Błąd",
              description: "Wybrana godzina jest już zajęta. Wybierz inną godzinę.",
            });
            return;
          }
          throw error;
        }
      }

      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error: any) {
      console.error("Error details:", error.response?.data);
      toast({
        variant: "destructive",
        title: "Błąd",
        description:
          error.response?.data?.message ||
          "Wystąpił problem podczas zapisywania klienta",
      });
    } finally {
      setIsLoading(false);
    }
  }

// Dodaj ten stan na początku twojego komponentu (przed return)
const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {isEdit ? "Edytuj klienta" : "Dodaj nowego klienta"}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          {isEdit
            ? "Zaktualizuj dane klienta"
            : "Wypełnij formularz, aby dodać nowego klienta"}
        </p>
      </div>

      <Card className="w-full">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-xl md:text-2xl">Dane klienta</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Wypełnij wszystkie wymagane pola
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imię</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => {
                    const [isOpen, setIsOpen] = useState(false);
                    
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data</FormLabel>
                        <Popover open={isOpen} onOpenChange={setIsOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-[240px] pl-3 text-left font-normal ${
                                  !field.value && "text-muted-foreground"
                                }`}
                                onClick={() => {
                                  console.log("Date clicked");
                                  setIsOpen(!isOpen); // Toggle instead of always true
                                }}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: pl })
                                ) : (
                                  <span>Wybierz datę</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                console.log("Selected date:", date); // Debug log
                                field.onChange(date);
                                setIsOpen(false); // Close the calendar after selecting a date
                              }}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startHour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Godzina rozpoczęcia</FormLabel>
                        <FormControl>
                          <TimePicker
                            date={new Date(
                              form.getValues("date").setHours(
                                parseInt(field.value),
                                parseInt(form.getValues("startMinute")),
                                0,
                                0
                              )
                            )}
                            onChange={(date) => {
                              form.setValue("startHour", date.getHours().toString().padStart(2, "0"));
                              form.setValue("startMinute", date.getMinutes().toString().padStart(2, "0"));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endHour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Godzina zakończenia</FormLabel>
                        <FormControl>
                          <TimePicker
                            date={new Date(
                              form.getValues("date").setHours(
                                parseInt(field.value),
                                parseInt(form.getValues("endMinute")),
                                0,
                                0
                              )
                            )}
                            onChange={(date) => {
                              form.setValue("endHour", date.getHours().toString().padStart(2, "0"));
                              form.setValue("endMinute", date.getMinutes().toString().padStart(2, "0"));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-medium">Dodatkowe informacje</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="added_description.contact_preference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferowany kontakt</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz preferowany kontakt" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="telephone">Telefon</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
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
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz priorytet" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="high">Wysoki</SelectItem>
                            <SelectItem value="medium">Średni</SelectItem>
                            <SelectItem value="low">Niski</SelectItem>
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
                        <Textarea {...field} />
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
                          value={typeof field.value === 'string' ? field.value : Array.isArray(field.value) ? field.value.join(", ") : ""}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            field.onChange(inputValue);
                          }}
                          onBlur={(e) => {
                            const inputValue = e.target.value;
                            const tags = inputValue.split(",").map(tag => tag.trim()).filter(Boolean);
                            field.onChange(tags);
                          }}
                          placeholder="Wpisz tagi oddzielone przecinkami"
                        />
                      </FormControl>
                      {Array.isArray(field.value) && field.value.length > 0 && (
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
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-medium">Dodatkowe pola</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomField}
                    className="w-full sm:w-auto"
                  >
                    Dodaj pole
                  </Button>
                </div>

                {customFields
                  .slice(
                    (customFieldsPage - 1) * ITEMS_PER_PAGE,
                    customFieldsPage * ITEMS_PER_PAGE,
                  )
                  .map((field, index) => (
                    <div
                      key={index}
                      className="flex flex-col space-y-2 p-4 border rounded-lg"
                    >
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Nazwa pola"
                          value={field.key}
                          onChange={(e) => updateCustomField(index, { ...field, key: e.target.value })}
                          className="flex-1"
                        />
                        <Select
                          value={field.type}
                          onValueChange={(value: "string" | "array" | "number") => handleCustomFieldTypeChange(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Typ pola" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">Tekst</SelectItem>
                            <SelectItem value="array">Lista</SelectItem>
                            <SelectItem value="number">Liczba</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => removeCustomField(index)}
                          className="w-full sm:w-auto"
                        >
                          Usuń
                        </Button>
                      </div>

                      {field.type === "array" ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Wartości (oddzielone przecinkami)"
                            value={typeof field.value === 'string' ? field.value : Array.isArray(field.value) ? field.value.join(", ") : ""}
                            onChange={(e) => handleCustomFieldValueChange(index, e.target.value)}
                          />
                          {Array.isArray(field.value) && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {field.value.map((item, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Input
                          placeholder={field.type === "number" ? "Wprowadź liczbę" : "Wprowadź wartość"}
                          value={field.value}
                          onChange={(e) => handleCustomFieldValueChange(index, e.target.value)}
                          type={field.type === "number" ? "number" : "text"}
                        />
                      )}
                    </div>
                  ))}

                {customFields.length > ITEMS_PER_PAGE && (
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCustomFieldsPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={customFieldsPage === 1}
                      className="w-full sm:w-auto"
                    >
                      Poprzednia
                    </Button>
                    <span className="text-sm">
                      Strona {customFieldsPage} z{" "}
                      {Math.ceil(customFields.length / ITEMS_PER_PAGE)}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCustomFieldsPage((prev) =>
                          Math.min(
                            prev + 1,
                            Math.ceil(customFields.length / ITEMS_PER_PAGE),
                          ),
                        )
                      }
                      disabled={
                        customFieldsPage ===
                        Math.ceil(customFields.length / ITEMS_PER_PAGE)
                      }
                      className="w-full sm:w-auto"
                    >
                      Następna
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  className="w-full sm:w-auto"
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading
                    ? "Zapisywanie..."
                    : isEdit
                      ? "Zapisz zmiany"
                      : "Dodaj klienta"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


