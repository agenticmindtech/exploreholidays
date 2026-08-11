import type { Sale, ValidationResult } from "@/lib/types";

export function validateSale(sale: Partial<Sale>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!sale.bookingNo?.trim()) errors.bookingNo = "Booking number is required.";
  if (!sale.transactionDate) errors.transactionDate = "Transaction date is required.";
  if (!sale.branchId) errors.branchId = "Please select a branch.";
  if (!sale.staffId) errors.staffId = "Staff is required.";
  if (!sale.serviceTypeId) errors.serviceTypeId = "Please select a service type.";
  if (!sale.supplierId) errors.supplierId = "Please select a supplier.";
  if (!sale.destination?.trim()) errors.destination = "Destination is required.";

  if (!(typeof sale.netCost === "number" && sale.netCost > 0)) {
    errors.netCost = "Net cost must be greater than 0.";
  }
  if (!(typeof sale.sellingPrice === "number" && sale.sellingPrice > 0)) {
    errors.sellingPrice = "Selling price must be greater than 0.";
  }

  if (!sale.paymentMethod) errors.paymentMethod = "Please select a payment method.";
  if (!sale.paymentStatus) errors.paymentStatus = "Please select a payment status.";

  if (sale.paymentStatus === "partial") {
    if (!(typeof sale.amountReceived === "number" && sale.amountReceived > 0)) {
      errors.amountReceived = "Amount received must be greater than 0 for a partial payment.";
    } else if (typeof sale.sellingPrice === "number" && sale.amountReceived >= sale.sellingPrice) {
      errors.amountReceived = "Amount received must be less than the selling price for a partial payment.";
    }
  }

  if (!sale.description || sale.description.trim().length < 5) {
    errors.description = "Description must be at least 5 characters.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
