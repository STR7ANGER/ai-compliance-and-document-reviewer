package classification
import "testing"
func TestClassificationCannotDowngrade(t *testing.T) { if Allows(Restricted, Public) { t.Fatal("restricted data was downgraded") }; if !Allows(Confidential, Restricted) { t.Fatal("stronger destination rejected") } }
func TestRetentionPolicy(t *testing.T) { if RetentionAllowed(0, false) { t.Fatal("zero retention accepted") }; if !RetentionAllowed(0, true) { t.Fatal("legal hold must preserve") } }
