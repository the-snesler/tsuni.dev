export type DrawingState = { state: 'closed' | 'drawing' | 'submitting' | 'closing' | 'closingSuccess' | 'complete'; error: boolean };

export type DrawingAction = 'SUBMIT' | 'SUBMIT_SUCCESS' | 'SUBMIT_ERROR' | 'ANIMATION_COMPLETE' | 'TOGGLE_CANVAS';

export const drawingReducer = (state: DrawingState, action: DrawingAction): DrawingState => {
  switch (state.state) {
    case 'closed':
      if (action === 'TOGGLE_CANVAS') return { state: 'drawing', error: false };
      break;

    case 'drawing':
      if (action === 'SUBMIT') return { state: 'submitting', error: false };
      if (action === 'TOGGLE_CANVAS') return { state: 'closing', error: state.error };
      break;

    case 'submitting':
      if (action === 'SUBMIT_SUCCESS') return { state: 'closingSuccess', error: false };
      if (action === 'SUBMIT_ERROR') return { state: 'drawing', error: true };
      break;

    case 'closing':
      if (action === 'ANIMATION_COMPLETE') return { state: 'closed', error: false };
      break;

    case 'closingSuccess':
      if (action === 'ANIMATION_COMPLETE') return { state: 'complete', error: false };
      break;

    case 'complete':
      // Terminal state - no transitions out
      break;
  }
  return state;
};
