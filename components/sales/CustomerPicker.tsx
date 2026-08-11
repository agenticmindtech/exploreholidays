"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, User as UserIcon, X } from "lucide-react";
import type { Customer, CustomerType } from "@/lib/types";
import { customersApi } from "@/lib/api/customersApi";
import SearchInput from "@/components/ui/SearchInput";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { cn } from "@/lib/utils/cn";

interface CustomerPickerProps {
  value: string | null;
  onChange: (customerId: string | null) => void;
  className?: string;
}

export default function CustomerPicker({ value, onChange, className }: CustomerPickerProps) {
  const toast = useToast();
  const currentUser = useAuthStore((s) => s.user);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNationality, setNewNationality] = useState("");
  const [newType, setNewType] = useState<CustomerType>("individual");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    if (!value) {
      Promise.resolve().then(() => {
        if (active) setSelected(null);
      });
      return () => {
        active = false;
      };
    }
    customersApi.get(value).then((customer) => {
      if (active) setSelected(customer);
    });
    return () => {
      active = false;
    };
  }, [value]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function handleSearch(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const envelope = await customersApi.list({ search: q, page: 1, pageSize: 8 });
    setResults(envelope.rows);
    setDropdownOpen(true);
  }

  function selectCustomer(customer: Customer) {
    setSelected(customer);
    onChange(customer.id);
    setDropdownOpen(false);
    setQuery("");
  }

  function openQuickAdd() {
    setNewName(query);
    setModalOpen(true);
  }

  async function handleCreate() {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error("Missing info", "Name and phone are required.");
      return;
    }
    setCreating(true);
    try {
      const customer = await customersApi.create(
        {
          name: newName.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim() || null,
          nationality: newNationality.trim() || null,
          type: newType,
        },
        currentUser?.id ?? "system"
      );
      toast.success("Customer added", customer.name);
      selectCustomer(customer);
      setModalOpen(false);
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewNationality("");
      setNewType("individual");
    } catch (err) {
      toast.error("Could not add customer", err instanceof Error ? err.message : "Try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <label className="label">Customer</label>

      {selected ? (
        <div className="flex items-center justify-between rounded-xl border border-lineStrong bg-surface px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-sm text-ink">
            <UserIcon className="h-4 w-4 text-inkMuted" /> {selected.name}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              onChange(null);
            }}
            aria-label="Clear customer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-inkMuted hover:bg-subtle hover:text-danger-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <SearchInput placeholder="Search customers by name or phone..." onSearch={handleSearch} />
      )}

      {!selected && dropdownOpen && (
        <div className="card absolute z-20 mt-1 max-h-64 w-full overflow-y-auto p-1.5">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCustomer(c)}
              className="flex min-h-[40px] w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-subtle"
            >
              <UserIcon className="h-4 w-4 shrink-0 text-inkMuted" />
              <span className="truncate">{c.name}</span>
              <span className="ml-auto shrink-0 text-xs text-inkMuted">{c.phone}</span>
            </button>
          ))}
          {results.length === 0 && <p className="px-3 py-2 text-xs text-inkMuted">No matches for &quot;{query}&quot;.</p>}
          <button
            type="button"
            onClick={openQuickAdd}
            className="mt-1 flex min-h-[40px] w-full items-center gap-2 rounded-lg border-t border-line px-3 py-2 text-left text-sm font-semibold text-primary-600 hover:bg-subtle"
          >
            <Plus className="h-4 w-4" /> New customer
          </button>
        </div>
      )}

      {!selected && !dropdownOpen && (
        <button type="button" onClick={openQuickAdd} className="mt-1.5 text-xs font-semibold text-primary-600 hover:underline">
          + New customer
        </button>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New customer" size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Name" required value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input label="Phone" required value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          <Input label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} hint="Optional" />
          <Input label="Nationality" value={newNationality} onChange={(e) => setNewNationality(e.target.value)} hint="Optional" />
          <Select label="Type" value={newType} onChange={(e) => setNewType(e.target.value as CustomerType)}>
            <option value="individual">Individual</option>
            <option value="corporate">Corporate</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={creating} onClick={handleCreate}>
              Add customer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
