"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { format, setHours, setMinutes } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { use } from "react";

const formSchema = z.object({
  name: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  lastname: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  telephone: z.string().min(9, "Nieprawidłowy numer telefonu"),
  title: z.string().min(2, "Tytuł musi mieć minimum 2 znaki"),
  description: z.string().min(2, "Opis musi mieć minimum 2 znaki"),
  time_from: z.date(),
  time_to: z.date(),
  datetime: z.date(),
  added_description: z.object({
    contact_preference: z.string().optional(),
    priority: z.string().optional(),
    dodatkowe: z.string().optional(),
    startDate: z.string().optional(),
    startHour: z.string().optional(),
    startMinute: z.string().optional(),
    endDate: z.string().optional(),
    endHour: z.string().optional(),
    endMinute: z.string().optional(),
    custom_fields: z.record(z.string()).optional(),
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

export default function ClientFormPage({
  params,
}: {
  params: Promise<{ action: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const resolvedParams = use(params);
  const isEdit = resolvedParams.action !== "new";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      lastname: "",
      telephone: "",
      title: "",
      description: "",
      time_from: new Date(),
      time_to: new Date(),
      datetime: new Date(),
      added_description: {
        contact_preference: "telephone",
        priority: "medium",
        dodatkowe: "",
        custom_fields: {},
      },
    },
  });

  useEffect(() => {
    if (isEdit) {
      fetchClient();
    }
  }, [isEdit]);

  const fetchClient = async () => {
    try {
      setIsLoading(true);
      const response = await clients.getById(resolvedParams.action);
      const customFieldsArray = Object.entries(response.added_description.custom_fields || {}).map(
        ([key, value]) => ({ key, value: value as string })
      );
      setCustomFields(customFieldsArray);
      form.reset({
        ...response,
        time_from: new Date(response.time_from),
        time_to: new Date(response.time_to),
        datetime: new Date(response.datetime),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: "Nie udało się pobrać danych klienta",
      });
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: "", value: "" }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, field: { key: string; value: string }) => {
    const newFields = [...customFields];
    newFields[index] = field;
    setCustomFields(newFields);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      const customFieldsObject = customFields.reduce((acc, { key, value }) => {
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      // Format dates to match API requirements
      const formatDate = (date: Date) => {
        return date.toISOString().split('.')[0]; // Remove milliseconds
      };

      const clientData = {
        name: values.name,
        lastname: values.lastname,
        telephone: values.telephone,
        title: values.title,
        description: values.description,
        time_from: formatDate(values.time_from),
        time_to: formatDate(values.time_to),
        datetime: formatDate(values.datetime),
        added_description: {
          contact_preference: values.added_description.contact_preference || "telephone",
          priority: values.added_description.priority || "medium",
          dodatkowe: values.added_description.dodatkowe || "",
          ...customFieldsObject
        }
      };

      if (isEdit) {
        await clients.update(resolvedParams.action, clientData);
        toast({
          title: "Sukces",
          description: "Klient został zaktualizowany",
        });
      } else {
        const response = await clients.create(clientData);
        console.log('Client created:', response);
        toast({
          title: "Sukces",
          description: "Klient został dodany",
        });
      }
      
      // Add a small delay before redirecting to ensure the toast is visible
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error: any) {
      console.error('Error details:', error.response?.data);
      toast({
        variant: "destructive",
        title: "Błąd",
        description: error.response?.data?.message || "Wystąpił problem podczas zapisywania klienta",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Edytuj klienta" : "Dodaj nowego klienta"}
        </h1>
        <p className="text-muted-foreground">
          {isEdit
            ? "Zaktualizuj dane klienta"
            : "Wypełnij formularz, aby dodać nowego klienta"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dane klienta</CardTitle>
          <CardDescription>
            Wypełnij wszystkie wymagane pola
          </CardDescription>
        </CardHeader>
        <CardContent>
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="time_from"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data i godzina rozpoczęcia</FormLabel>
                      <div className="flex flex-col space-y-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full pl-3 text-left font-normal"
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
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <TimePicker
                          date={field.value}
                          onChange={field.onChange}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time_to"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data i godzina zakończenia</FormLabel>
                      <div className="flex flex-col space-y-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full pl-3 text-left font-normal"
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
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <TimePicker
                          date={field.value}
                          onChange={field.onChange}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="datetime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data i godzina utworzenia</FormLabel>
                      <div className="flex flex-col space-y-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full pl-3 text-left font-normal"
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
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <TimePicker
                          date={field.value}
                          onChange={field.onChange}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        defaultValue={field.value}
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
                        defaultValue={field.value}
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
                name="added_description.dodatkowe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dodatkowe informacje</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Dodatkowe pola</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomField}
                  >
                    Dodaj pole
                  </Button>
                </div>
                {customFields.map((field, index) => (
                  <div key={index} className="flex space-x-2">
                    <Input
                      placeholder="Nazwa pola"
                      value={field.key}
                      onChange={(e) =>
                        updateCustomField(index, {
                          ...field,
                          key: e.target.value,
                        })
                      }
                    />
                    <Input
                      placeholder="Wartość"
                      value={field.value}
                      onChange={(e) =>
                        updateCustomField(index, {
                          ...field,
                          value: e.target.value,
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removeCustomField(index)}
                    >
                      Usuń
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                >
                  Anuluj
                </Button>
                <Button type="submit" disabled={isLoading}>
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