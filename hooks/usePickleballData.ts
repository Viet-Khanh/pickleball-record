'use client'

import { useCallback, useEffect, useReducer } from 'react'
import {
  fetchPickleballData,
  toErrorMessage,
  type PickleballData,
} from '@/lib/pickleball-api'

type PickleballDataState = PickleballData & {
  loading: boolean
  error: string
  loaded: boolean
  revision: number
}

type PickleballDataAction =
  | { type: 'load:start' }
  | { type: 'load:success'; payload: PickleballData; errorMessage: string }
  | { type: 'load:error'; error: string }
  | { type: 'set:error'; error: string }
  | { type: 'refresh' }

const initialState: PickleballDataState = {
  players: [],
  contributions: [],
  sessions: [],
  sessionPlayers: [],
  matches: [],
  fundExpenses: [],
  matchPayments: [],
  loading: true,
  error: '',
  loaded: false,
  revision: 0,
}

function reducer(state: PickleballDataState, action: PickleballDataAction): PickleballDataState {
  switch (action.type) {
    case 'load:start':
      return { ...state, loading: !state.loaded }
    case 'load:success':
      return {
        ...state,
        ...action.payload,
        error: action.errorMessage,
        loading: false,
        loaded: true,
      }
    case 'load:error':
      return { ...state, error: action.error, loading: false, loaded: true }
    case 'set:error':
      return { ...state, error: action.error }
    case 'refresh':
      return { ...state, revision: state.revision + 1 }
  }
}

export function usePickleballData() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      dispatch({ type: 'load:start' })
      try {
        const { errorMessage, ...payload } = await fetchPickleballData()
        if (!cancelled) {
          dispatch({ type: 'load:success', payload, errorMessage })
        }
      } catch (error) {
        if (!cancelled) {
          dispatch({ type: 'load:error', error: toErrorMessage(error) })
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [state.revision])

  const setError = useCallback((error: string) => {
    dispatch({ type: 'set:error', error })
  }, [])

  const refresh = useCallback(() => {
    dispatch({ type: 'refresh' })
  }, [])

  return {
    ...state,
    setError,
    refresh,
  }
}
