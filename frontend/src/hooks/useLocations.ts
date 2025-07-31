import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { County, Town, ApiResponse } from '@/types/property';

export const useCounties = () => {
  const [counties, setCounties] = useState<County[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCounties = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<ApiResponse<County>>('/counties/');
        setCounties(response.data.results);
      } catch (err) {
        setError('Failed to fetch counties');
        console.error('Counties fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounties();
  }, []);

  return { counties, loading, error };
};

export const useTowns = (countySlug?: string) => {
  const [towns, setTowns] = useState<Town[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countySlug) {
      setTowns([]);
      return;
    }

    const fetchTowns = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<Town[]>(`/counties/${countySlug}/towns/`);
        setTowns(response.data);
      } catch (err) {
        setError('Failed to fetch towns');
        console.error('Towns fetch error:', err);
        setTowns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTowns();
  }, [countySlug]);

  return { towns, loading, error };
};

export const useAllTowns = () => {
  const [towns, setTowns] = useState<Town[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTowns = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<ApiResponse<Town>>('/towns/');
        setTowns(response.data.results);
      } catch (err) {
        setError('Failed to fetch towns');
        console.error('Towns fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTowns();
  }, []);

  return { towns, loading, error };
};