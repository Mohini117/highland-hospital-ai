import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useState } from "react";
import { OnApproveData } from "@paypal/paypal-js";
import {
  createPayPalOrder,
  approvePayPalOrder,
} from "@/lib/actions/appointment.actions";
import { toast } from "react-hot-toast";

interface PayPalButtonProps {
  appointmentId: string;
  disabled: boolean;
  onSuccess: () => void;
}

export default function PayPalCheckoutButton({
  appointmentId,
  disabled,
  onSuccess,
}: PayPalButtonProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [IsApproving, setIsApproving] = useState(false);

  if (isPending) {
    return (
      <div className="text-center h-12 flex items-center justify-center my-4 text-muted-foreground">
        Loading Paypal...
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="text-alert-2 text-center my-4">
        Error Loading PayPal checkout. Please try again
      </div>
    );
  }

  const createOrder = async () => {
    setIsCreatingOrder(true);
    const toastId = toast.loading("Initiating PayPal...");
    try {
      const result = await createPayPalOrder(appointmentId);
      if (result.success && result.data?.orderId) {
        toast.success("Proceeding to PayPal", { id: toastId });
        return result.data.orderId;
      }
      toast.error(result.message || "Failed to create order", { id: toastId });
      //add small delay 100 milli seconds
      await new Promise((resolve) => setTimeout(resolve, 100));
      throw new Error("ORDER_CREATION_FAILED");
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message !== "ORDER_CREATION_FAILED") {
          toast.error(error.message, { id: toastId });
        }
      } else {
        toast.error("An unexpected error occured. Please try again", {
          id: toastId,
        });
      }
      //add delay
      await new Promise((resolve) => setTimeout(resolve, 100));
      throw error;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const onApprove = async (data: OnApproveData) => {
    setIsApproving(true);
    const toastId = toast.loading("Verifying payment...");
    try {
      const result = await approvePayPalOrder(appointmentId, {
        orderId: data.orderID,
      });
      if (result.success) {
        toast.success("Payment successful ! Redirecting...", { id: toastId });
        onSuccess();
        return;
      }
      throw new Error(result.message || "Payment verification failed");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message, { id: toastId });
      } else {
        toast.error(
          "An unexpected error occured during paypal approaval. Please try again",
          { id: toastId }
        );
      }
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="relative">
      {isCreatingOrder && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded z-10">
          <div className="text-sm text-gray-600">Creating order...</div>
        </div>
      )}
      {IsApproving && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded z-10">
          <div className="text-sm text-gray-600">Verifying Payment...</div>
        </div>
      )}
      <PayPalButtons
        key={appointmentId}
        createOrder={createOrder}
        onApprove={onApprove}
        disabled={disabled || isCreatingOrder || IsApproving}
        style={{ layout: "vertical", label: "pay" }}
        onError={(err) => {
          console.log("Paypal checkout error", err);
        }}
      />
    </div>
  );
}
