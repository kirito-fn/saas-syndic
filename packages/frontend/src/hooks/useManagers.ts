import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth.api.js";

export function useManagers() {
  return useQuery({
    queryKey: ["managers"],
    queryFn: authApi.listManagers,
  });
}

export function useDeleteManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.deleteManager,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["managers"] });
      qc.invalidateQueries({ queryKey: ["buildings"] });
    },
  });
}
