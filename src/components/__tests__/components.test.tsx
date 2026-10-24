import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import * as Native from 'react-native';
import { cues } from '@/cues';

import { AccessibleButton, AdjustableRow, StatusBorder, ToggleRow } from '@/components';
jest.mock('@/cues', () => ({ cues: { say: jest.fn(), configure: jest.fn() } }));

describe('AccessibleButton', () => {
  it('shows keyboard focus and preserves full text contrast when disabled', () => {
    const { rerender } = render(
      <AccessibleButton label="Settings" hint="h" onPress={() => {}} testID="focus" />,
    );
    fireEvent(screen.getByTestId('focus'), 'focus');
    expect(Native.StyleSheet.flatten(screen.getByTestId('focus').props.style).borderWidth).toBe(4);
    fireEvent(screen.getByTestId('focus'), 'blur');
    rerender(
      <AccessibleButton label="Settings" hint="h" onPress={() => {}} disabled testID="focus" />,
    );
    const style = Native.StyleSheet.flatten(screen.getByTestId('focus').props.style);
    expect(style.opacity ?? 1).toBe(1);
    expect(style.borderStyle).toBe('dashed');
    expect(screen.getByTestId('focus').props.accessibilityState.disabled).toBe(true);
  });
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
    render(
      <AccessibleButton
        label="Settings"
        hint="h"
        icon="settings-outline"
        text=""
        onPress={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(screen.queryByTestId('icon-settings-outline')).toBeNull();
    expect(
      screen.getByTestId('icon-settings-outline', { includeHiddenElements: true }),
    ).toBeTruthy();
  });
});

describe('ToggleRow', () => {
  it('announces a changed value through the shared engine without duplicating a screen reader', () => {
    function Setting() {
      const [value, update] = useState(false);
      return <ToggleRow label="Auto lens" value={value} onChange={update} />;
    }
    render(<Setting />);
    fireEvent.press(screen.getByRole('switch'));
    expect(screen.getByRole('switch').props.accessibilityState.checked).toBe(true);
    expect(cues.say).toHaveBeenLastCalledWith(
      expect.objectContaining({ text: 'Auto lens. On', duplicatesScreenReader: true }),
    );
  });
  it('stacks its visible state below the label at large text sizes', () => {
    const dimensions = jest
      .spyOn(Native, 'useWindowDimensions')
      .mockReturnValue({ width: 320, height: 568, scale: 2, fontScale: 2.5 });
    render(<ToggleRow label="A long setting label" value={false} onChange={() => {}} />);
    expect(Native.StyleSheet.flatten(screen.getByRole('switch').props.style).flexDirection).toBe(
      'column',
    );
    dimensions.mockRestore();
  });
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
