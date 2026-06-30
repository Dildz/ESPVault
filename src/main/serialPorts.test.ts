import { describe, expect, it } from "vitest";
import {
  isLegacyLinuxTtyPort,
  isPreferredSerialPort,
  shouldHideLegacyLinuxTtyPortsByDefault,
  type SelectableSerialPort
} from "./serialPorts";

describe("serial port helpers", () => {
  it("detects Linux ttyS ports as legacy serial ports", () => {
    expect(isLegacyLinuxTtyPort(port({ portName: "ttyS0" }), "linux")).toBe(
      true
    );
    expect(isLegacyLinuxTtyPort(port({ portId: "/dev/ttyS31" }), "linux")).toBe(
      true
    );
    expect(isLegacyLinuxTtyPort(port({ displayName: "ttyS7" }), "linux")).toBe(
      true
    );
  });

  it("does not treat USB, ACM, or non-Linux serial ports as legacy ttyS ports", () => {
    expect(isLegacyLinuxTtyPort(port({ portName: "ttyUSB0" }), "linux")).toBe(
      false
    );
    expect(isLegacyLinuxTtyPort(port({ portName: "/dev/ttyACM0" }), "linux")).toBe(
      false
    );
    expect(isLegacyLinuxTtyPort(port({ portName: "ttyS0" }), "win32")).toBe(
      false
    );
  });

  it("hides legacy Linux ttyS ports only when other serial ports are available", () => {
    expect(
      shouldHideLegacyLinuxTtyPortsByDefault(
        [
          port({ portName: "/dev/ttyS0" }),
          port({ portName: "/dev/ttyUSB0" })
        ],
        "linux"
      )
    ).toBe(true);

    expect(
      shouldHideLegacyLinuxTtyPortsByDefault(
        [port({ portName: "/dev/ttyS0" }), port({ portName: "/dev/ttyS1" })],
        "linux"
      )
    ).toBe(false);

    expect(
      shouldHideLegacyLinuxTtyPortsByDefault(
        [
          port({ portName: "/dev/ttyS0" }),
          port({ portName: "/dev/ttyUSB0" })
        ],
        "darwin"
      )
    ).toBe(false);
  });

  it("marks USB ESP-style ports as preferred", () => {
    expect(isPreferredSerialPort(port({ displayName: "CP2102 USB to UART" }))).toBe(
      true
    );
    expect(isPreferredSerialPort(port({ displayName: "ttyS0" }))).toBe(false);
  });
});

function port(values: Partial<SelectableSerialPort>): SelectableSerialPort {
  return {
    portId: values.portId ?? values.portName ?? "port-id",
    ...values
  };
}
