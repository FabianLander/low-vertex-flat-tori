import java.awt.event.*;
import java.awt.*;

public class TorusBig {
    VectorBig[] U=new VectorBig[8];
    
    public TorusBig() {}

    public TorusBig(TorusBig T) {
	for(int i=0;i<8;++i) U[i]=new VectorBig(T.U[i]);
    }

    public void print() {
	for(int i=0;i<8;++i) U[i].print();
    }
}

