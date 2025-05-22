"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clients } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Search } from "lucide-react";

interface Client {
  uuid: string;
  name: string;
  lastname: string;
  telephone: string;
  title: string;
  description: string;
  time_from: string;
  time_to: string;
  datetime: string;
  added_description: {
    contact_preference: string;
    notes: string;
    priority: string;
    tags: string[];
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchClients();
  }, [currentPage, searchQuery]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await clients.getAll(currentPage, 10, searchQuery);
      // Sort clients by priority
      const sortedClients = response.clients.sort((a: Client, b: Client) => {
        const priorityOrder: Record<string, number> = {
          high: 0,
          medium: 1,
          low: 2,
        };
        return (
          priorityOrder[a.added_description.priority] -
          priorityOrder[b.added_description.priority]
        );
      });
      setClientsList(sortedClients);
      setTotalPages(response.pagination.total_pages);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Błąd",
        description: "Nie udało się pobrać listy klientów",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Klienci</h1>
          <p className="text-muted-foreground">
            Zarządzaj swoimi klientami i spotkaniami
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/clients/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj klienta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista klientów</CardTitle>
          <CardDescription>
            Przeszukuj i zarządzaj swoimi klientami
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj klientów..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imię i nazwisko</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Tytuł</TableHead>
                  <TableHead>Data spotkania</TableHead>
                  <TableHead>Priorytet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Ładowanie...
                    </TableCell>
                  </TableRow>
                ) : clientsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Brak klientów
                    </TableCell>
                  </TableRow>
                ) : (
                  clientsList.map((client) => (
                    <TableRow
                      key={client.uuid}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() =>
                        router.push(`/dashboard/clients/${client.uuid}`)
                      }
                    >
                      <TableCell>
                        {client.name} {client.lastname}
                      </TableCell>
                      <TableCell>{client.telephone}</TableCell>
                      <TableCell>{client.title}</TableCell>
                      <TableCell>{formatDate(client.time_from)}</TableCell>
                      <TableCell>
                        <span
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
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Poprzednia
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Następna
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



