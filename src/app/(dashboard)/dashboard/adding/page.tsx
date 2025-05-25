"use client";

import { useState } from "react";
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
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Imię musi mieć minimum 2 znaki"),
  lastname: z.string().min(2, "Nazwisko musi mieć minimum 2 znaki"),
  telephone: z.string().min(9, "Nieprawidłowy numer telefonu"),
  title: z.string().min(2, "Tytuł musi mieć minimum 2 znaki"),
  description: z.string(),
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
    progress: z.enum(["todo", "in-progress", "completed"]).default("todo"),
    custom_fields: z.record(z.any()).optional(),
  }),
});

export default function AddingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
        progress: "todo",
        custom_fields: {},
      },
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);

      // Create time_from and time_to dates from the selected date and times
      const timeFrom = new Date(values.date);
      timeFrom.setHours(
        parseInt(values.startHour),
        parseInt(values.startMinute),
      );

      const timeTo = new Date(values.date);
      timeTo.setHours(parseInt(values.endHour), parseInt(values.endMinute));

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
          contact_preference:
            values.added_description.contact_preference || "telephone",
          priority: values.added_description.priority || "medium",
          notes: values.added_description.notes || "",
          tags: values.added_description.tags || [],
          progress: values.added_description.progress,
        },
      };

      const response = await clients.create(clientData);
      console.log("Client created:", response);
      toast({
        title: "Sukces",
        description: "Klient został dodany",
      });

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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Dodaj nowego klienta
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Wypełnij formularz, aby dodać nowego klienta
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
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data</FormLabel>
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
                              disabled={(date) => date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormLabel>Godzina rozpoczęcia</FormLabel>
                    <div className="flex space-x-2">
                      <FormField
                        control={form.control}
                        name="startHour"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Godz" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem
                                    key={i}
                                    value={i.toString().padStart(2, "0")}
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
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Min" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (
                                  <SelectItem
                                    key={i}
                                    value={(i * 5).toString().padStart(2, "0")}
                                  >
                                    {(i * 5).toString().padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <FormLabel>Godzina zakończenia</FormLabel>
                    <div className="flex space-x-2">
                      <FormField
                        control={form.control}
                        name="endHour"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Godz" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem
                                    key={i}
                                    value={i.toString().padStart(2, "0")}
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
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Min" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (
                                  <SelectItem
                                    key={i}
                                    value={(i * 5).toString().padStart(2, "0")}
                                  >
                                    {(i * 5).toString().padStart(2, "0")}
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
                  name="added_description.progress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="todo">Do zrobienia</SelectItem>
                          <SelectItem value="in-progress">W trakcie</SelectItem>
                          <SelectItem value="completed">Zakończone</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          {...field}
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  {isLoading ? "Zapisywanie..." : "Dodaj klienta"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
