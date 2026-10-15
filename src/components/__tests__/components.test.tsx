import { fireEvent, render, screen } from '@testing-library/react-native';

import { AccessibleButton, AdjustableRow, StatusBorder, ToggleRow } from '@/components';

describe('AccessibleButton', () => {
  it('exposes label, role and hint, and fires onPress', () => {
    const onPress = jest.fn();
    render(<AccessibleButton label="Record" hint="Starts recording" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Record' });
    expect(button.props.accessibilityHint).toBe('Starts recording');
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is at least 60 x 60 pt', () => {
    render(<AccessibleButton label="X" hint="h" onPress={() => {}} testID="b" />);
    const flat = Object.assign({}, ...[screen.getByTestId('b').props.style].flat(Infinity));
    expect(flat.minWidth).toBeGreaterThanOrEqual(60);
    expect(flat.minHeight).toBeGreaterThanOrEqual(60);
  });

  it('hides the decorative icon from screen readers', () => {
    render(<AccessibleButton label="Settings" hint="h" icon="⚙" text="" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(screen.queryByText('⚙')).toBeNull();
    expect(screen.getByText('⚙', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('ToggleRow', () => {
  it('is a switch with checked state and toggles', () => {
    const onChange = jest.fn();
    render(<ToggleRow label="Auto lens switching" value={false} onChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Auto lens switching' });
    expect(sw.props.accessibilityState.checked).toBe(false);
    expect(sw.props.accessibilityHint).toBe('Double tap to turn on');
    fireEvent.press(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('AdjustableRow', () => {
  it('responds to increment and decrement accessibility actions', () => {
    const inc = jest.fn();
    const dec = jest.fn();
    render(
      <AdjustableRow label="Verbosity" valueText="Standard" onIncrement={inc} onDecrement={dec} />,
    );
    const row = screen.getByRole('adjustable', { name: 'Verbosity' });
    expect(row.props.accessibilityValue).toEqual({ text: 'Standard' });
    fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    fireEvent.press(row);
    expect(inc).toHaveBeenCalledTimes(2);
    expect(dec).toHaveBeenCalledTimes(1);
  });
});

describe('StatusBorder', () => {
  it.each([
    ['good', 'status-border-solid'],
    ['adjust', 'status-border-dashed'],
    ['problem', 'status-border-double'],
  ] as const)('%s uses a distinct border style', (status, testID) => {
    render(<StatusBorder status={status} />);
    expect(screen.getByTestId(testID, { includeHiddenElements: true })).toBeTruthy();
  });

  it('renders nothing without a status', () => {
    render(<StatusBorder status={null} />);
    expect(screen.toJSON()).toBeNull();
  });
});
