"""Low-level access to devices connected to hub ports."""

from hub.port import Port
from typing import Awaitable, Final, TypeAlias

Device: TypeAlias = int
COLOR_SENSOR: Final[Device] = 61
DISTANCE_SENSOR: Final[Device] = 62
FORCE_SENSOR: Final[Device] = 63
COLOR_MATRIX: Final[Device] = 64
MEDIUM_MOTOR: Final[Device] = 48
LARGE_MOTOR: Final[Device] = 49
SMALL_MOTOR: Final[Device] = 65

def data(port: Port) -> tuple[int]:
    """Return raw LPF-2 data from a device."""
    ...

def id(port: Port) -> int:
    """Return the attached device type identifier."""
    ...

def get_duty_cycle(port: Port) -> int:
    """Return the device duty cycle."""
    ...

def ready(port: Port) -> bool:
    """Return whether the attached device is ready for requests."""
    ...

def set_duty_cycle(port: Port, duty_cycle: int) -> None:
    """Set the device duty cycle in the range 0 to 10000."""
    ...